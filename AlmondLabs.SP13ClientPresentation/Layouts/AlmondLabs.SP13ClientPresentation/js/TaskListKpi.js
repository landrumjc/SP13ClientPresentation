(function () {
    if (typeof SPClientTemplates === 'undefined')
        return;

    var TaskListKpiView = function (ctx) {
        var dueDate = new Date(Date.parse(ctx.CurrentItem.DueDate));
        var now = new Date();
        var html = "<style type='text/css'> .kpi { height:25px; width: 30px; border-radius: 15px; } .kpi img { max-height: 25px; }</style>";

        var span = dueDate.getTime() - now.getTime();
        var daySpan = span / 1000 / 86400;
        var dayInt = daySpan < 0 ? Math.ceil(daySpan) : Math.floor(daySpan);

        if (span < 0) {
            dayInt *= -1;
            return html + "<div class='kpi bad' title='" + dayInt + " days overdue'><img src='/_layouts/images/kpidefaultlarge-2.gif' /></div>";
        }

        if (daySpan < 7) {
            return html + "<div class='kpi maybe' title='due in " + dayInt + " days'><img src='/_layouts/images/kpidefaultlarge-1.gif' /></div>";
        }

        return html + "<div class='kpi good' title='due in " + dayInt + " days'><img src='/_layouts/images/kpidefaultlarge-0.gif' /></div>";
    };

    var fieldCtx = {};

    fieldCtx.Templates = {};
    //associate the various templates with rendering functions for our field.
    //when a list view is returned to the user, SharePoint will fire the function associate with 'View'.
    //when a list item is in New, SharePoint will fire the function associated with NewForm, etc.
    fieldCtx.Templates.Fields = {
        //RecipeIngredients is the Name of our field
        'DueDate': {
            'View': TaskListKpiView//,
            /*'DisplayForm': customDisplayFrom,
            'EditForm': customNewAndEdit, //using the same function for New and Edit, but they could be different
            'NewForm': customNewAndEdit*/
        }
    };

    //register the template to render our field
    SPClientTemplates.TemplateManager.RegisterTemplateOverrides(fieldCtx);

})();