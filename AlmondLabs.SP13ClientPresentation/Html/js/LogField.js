//Register view callbacks
(function () {
    function Display(ctx) {
        console.debug(ctx);
        return "<div class='AppendOnlyFieldPrefix'></div>";
    };

    if (typeof SPClientTemplates === 'undefined')
        return;

    var called = false;
    var fieldCtx = {};
    fieldCtx.OnPostRender = function (ctx) {
        var div = jQuery(".AppendOnlyFieldPrefix").next();
        if (div.length > 0 && !called) {
            var html = div.html();
            var match;
            while (matches = html.match(/<\/a>\):\s([^<]+)<br>/)) {
                html = html.replace(matches[1], "<pre style='margin:0px'>" + matches[1] + "</pre>");
            }
            div.html(html);
            called = true;
        }
    };
    fieldCtx.Templates = {};
    fieldCtx.Templates.Fields = {
        'Result': {
            'DisplayForm': Display,
        }
    };

    SPClientTemplates.TemplateManager.RegisterTemplateOverrides(fieldCtx);
})();