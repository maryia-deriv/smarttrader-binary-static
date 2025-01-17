const Client           = require('../base/client');
const BinarySocket     = require('../base/socket');
const State            = require('../../_common/storage').State;

/*
    data-show attribute controls element visibility based on
        - current landing company
        - metatrader availability
        - logged in status

    attribute value is a list of comma separated
        - landing company shortcodes
        - 'mtcompany' code that stands for metatrader availability
        - 'default' code that describes logged out users
        - mt5fin rules for mt5 financial company shortcodes
            starts with 'mt5fin:'
            e.g. 'mt5fin:vanuatu' will match if clients mt5 financial company shortcode is 'vanuatu'

    Examples:
        Show only for logged in clients with svg landing company:
            data-show='svg'

        Show for svg and malta:
            data-show='svg, malta'

        Hide for svg:
            data-show='-svg'

        Hide for malta and maltainvest:
            data-show='-malta, -maltainvest'

        Show for clients with 'vanuatu' mt5 financial company
            data-show='mt5fin:vanuatu'

        Show for clients either with  'vanuatu' or 'labuan' mt5 financial company
            data-show='mt5fin:vanuatu, labuan'

    Prohibited values:
        Cannot mix includes and excludes:
            data-show='svg, -malta' -> throws error
        Shortcodes are case sensitive:
            data-show='SVG'         -> throws error
*/

const mt_company_rule      = 'mtcompany';
const eu_country_rule      = 'eucountry';
const options_blocked_rule = 'optionsblocked';

const ContentVisibility = (() => {
    let $center_select_m;

    const init = () =>
        new Promise(resolve => {
            BinarySocket.wait('authorize', 'landing_company', 'website_status').then(() => {
                resolve();
            });
        })
    ;

    const generateParsingErrorMessage = (reason, attr_str) => (
        `Invalid data-show attribute value! ${reason} Given value: '${attr_str}'.`
    );

    const parseAttributeString = (attr_str) => {
        let names = attr_str.split(',').map(name => name.trim());

        if (names.some(name => name.length === 0)) {
            throw new Error(generateParsingErrorMessage('No empty names allowed.', attr_str));
        }
        const is_exclude = names.every(name => name.charAt(0) === '-');
        const is_include = names.every(name => name.charAt(0) !== '-');

        if (!is_exclude && !is_include) {
            throw new Error(generateParsingErrorMessage('No mixing of includes and excludes allowed.', attr_str));
        }
        if (is_exclude) {
            names = names.map(name => name.slice(1));
        }

        const mt5fin_rules = names
            .filter(name => isMT5FinRule(name))
            .map(rule => parseMT5FinRule(rule));

        names = names.filter(name => !isMT5FinRule(name));

        return {
            is_exclude,
            names,
            mt5fin_rules,
        };
    };

    const isEuCountry = () => {
        const eu_shortcode_regex  = new RegExp('^(maltainvest|malta|iom)$');
        const eu_excluded_regex   = new RegExp('^mt$');
        const financial_shortcode = State.getResponse('landing_company.financial_company.shortcode');
        const gaming_shortcode    = State.getResponse('landing_company.gaming_company.shortcode');
        const clients_country     = Client.get('residence') || State.getResponse('website_status.clients_country');
        return (
            (financial_shortcode || gaming_shortcode) ?
                (eu_shortcode_regex.test(financial_shortcode) || eu_shortcode_regex.test(gaming_shortcode)) :
                eu_excluded_regex.test(clients_country)
        );
    };

    const isMT5FinRule = (rule) => /^mt5fin:/.test(rule);

    const parseMT5FinRule = (rule) => rule.match(/^mt5fin:(.+)$/)[1];

    const shouldShowElement = (
        attr_str,
        current_landing_company_shortcode,
        client_has_mt_company,
        arr_mt5fin_shortcodes
    ) => {
        const {
            is_exclude,
            mt5fin_rules,
            names,
        } = parseAttributeString(attr_str);
        const rule_set = new Set(names);

        const is_eu_country           = isEuCountry();
        const rule_set_has_current    = rule_set.has(current_landing_company_shortcode);
        const rule_set_has_mt         = rule_set.has(mt_company_rule);
        const rule_set_has_eu_country = rule_set.has(eu_country_rule);
        const options_blocked         = rule_set.has(options_blocked_rule);

        let show_element = false;

        if (client_has_mt_company && rule_set_has_mt) show_element = !is_exclude;
        else if (is_exclude !== rule_set_has_current) show_element = true;
        if (rule_set_has_eu_country && is_eu_country) show_element = !is_exclude;
        else if (is_eu_country && current_landing_company_shortcode === 'default') { // for logged out EU clients, check if IP landing company matches
            const financial_shortcode = State.getResponse('landing_company.financial_company.shortcode');
            const gaming_shortcode    = State.getResponse('landing_company.gaming_company.shortcode');
            if (rule_set.has(financial_shortcode) || rule_set.has(gaming_shortcode)) {
                show_element = !is_exclude;
            }
        }

        // Check if list of mt5fin_company_shortcodes is array type and filter with defined mt5fin rules
        if (Array.isArray(arr_mt5fin_shortcodes)) {
            if (arr_mt5fin_shortcodes.some(el => mt5fin_rules.includes(el))) show_element = !is_exclude;
        }
        if (options_blocked && Client.isOptionsBlocked()) {
            show_element = !is_exclude;
        }

        return show_element;
    };

    // if text is hidden, we need to append it to body to be able to get its width
    const getTextWidth = (text) => {
        const $el = $('<span />', { text });
        $el.prependTo('body');
        const el_width = $el.width();
        $el.remove();
        return el_width;
    };

    const centerSelect = ($el) => {
        const option_width = getTextWidth($el.children(':selected').html());
        const empty_space = '280' - option_width; // in mobile all select drop-downs are hardcoded to be at 280px in css
        $el.css('text-indent', (empty_space / 2) - 7); // 7px is for the drop-down arrow
    };

    const centerAlignSelect = (should_init) => {
        $(window).off('resize', centerAlignSelect);
        $center_select_m = ((typeof should_init === 'boolean' && should_init) || !$center_select_m) ? $('.center-select-m') : $center_select_m;

        if ($(window).width() <= 480) {
            $center_select_m.on('change', function() {
                centerSelect($(this));
            });
        } else {
            $center_select_m.each(function() {
                $(this).css('text-indent', 0);
            });
            $(window).resize(centerAlignSelect);
        }
    };

    return {
        centerAlignSelect,
        init,
        __test__: {
            parseAttributeString,
            shouldShowElement,
        },
    };
})();

module.exports = ContentVisibility;
