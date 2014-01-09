function AssociatedDocuments() { }

//function called when our field is shown in a View
AssociatedDocuments.View = function (ctx) {
    return AssociatedDocuments.ReadContext(ctx);
};

AssociatedDocuments.ReadContext = function (ctx) {
    var currentItem = ctx.CurrentItem;

    //build local context object
    var item = {};
    item.Id = currentItem.ID;
    item.Title = currentItem.Title;
    item.ElementId = 'associatedDocuments_' + item.Id;
    item.ListId = ctx.listName.replace("{", "").replace("}", "");
    item.LookupData = currentItem.AssociatedDocuments;

    //Load current SPField data to get lookup information
    var apiUrl = _spPageContextInfo.webServerRelativeUrl.replace(/\/$/, "") + "/_api/lists(guid'" + item.ListId + "')/Fields";
    jQuery.SP.ajax(apiUrl).success(function (data) {
        var fields = data.d.results;
        var x; for (x = 0; x < fields.length && fields[x].InternalName != "AssociatedDocuments"; x++) { }

        if (x < fields.length) {
            item.FieldId = fields[x].Id;
            item.TargetWebId = fields[x].LookupWebId;
            item.TargetListId = fields[x].LookupList.replace("{", "").replace("}", "");
            item.UploadPageUrl = "/_layouts/15/AlmondLabs.SP13ClientPresentation/FileUpload.aspx?itemId=" + item.Id + "&fieldId=" + item.FieldId + "&listId=" + item.ListId + "&targetWebId=" + item.TargetWebId + "&targetListId=" + item.TargetListId;

            //defer view rendering until after SharePoint has finished rendering the list
            setTimeout(function () { AssociatedDocuments.RenderView(item); }, 1);
        }
    });

    return '<div id="' + item.ElementId + '"><img src="/_layouts/images/loading.gif" /></div>';
};

//Ensure knockout.js has been loaded to the page
AssociatedDocuments.Knockout = function (complete) {
    if (typeof ko == "undefined") {
        jQuery.ajax({
            url: "https://ajax.aspnetcdn.com/ajax/knockout/knockout-2.2.1.js",
            dataType: "script"
        }).success(complete);
        return false;
    }

    return true;
};

AssociatedDocuments.RenderView = function (item) {
    //Ensure knockout has been loaded
    if (!AssociatedDocuments.Knockout(function () { AssociatedDocuments.RenderView(item); }))
        return;

    //get container element returned by AssociatedDocuments.View
    var fieldElem = document.getElementById(item.ElementId);

    //check if Knockout templates have been loaded
    if (!document.getElementById("AssociatedDocumentsTemplate")) {
        jQuery.ajaxSetup({ async: false });
        jQuery(fieldElem).load("/_layouts/15/AlmondLabs.SP13ClientPresentation/ko/AssociatedDocumentsTemplates.html");
        jQuery.ajaxSetup({ async: true });
    }

    //create knockout binding element
    var koDiv = document.createElement("div");
    koDiv.setAttribute("data-bind", "template: 'AssociatedDocumentsTemplate'")
    fieldElem.appendChild(koDiv);

    //hide loading gif
    jQuery(fieldElem).children("img").hide();
    //Process knockout bindings scoped to the current item
    ko.applyBindings(new AssociatedDocuments.ViewModel(item), fieldElem);
};

//Define the field knockout view model
AssociatedDocuments.ViewModel = function (item) {
    var self = this;
    self.ItemTitle = item.Title
    self.UploadPageUrl = item.UploadPageUrl;
    self.LookupData = ko.observableArray(item.LookupData);
    self.TargetListId = ko.observable(item.TargetListId);

    //Open SharePoint modal to show the upload document page
    self.AddDocuments = function () {
        var options = {
            title: "Associate files with '" + self.ItemTitle + "'", url: self.UploadPageUrl, width: 430, height: 500, allowMaximize: false, showClose: true, dialogReturnValueCallback: function (dialogResult, returnValue) {
                SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.RefreshPage', SP.UI.DialogResult.OK);
            }
        };

        SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
    };

    //Open SharePoint modal to show the view item page for a document
    self.ViewDocument = function (data) {
        var lookupId = data.lookupId;
        var apiUrl = _spPageContextInfo.webServerRelativeUrl + "_api/lists(guid'" + self.TargetListId() + "')/Forms";

        //Ajax request to get forms data for the lookup list
        jQuery.SP.ajax(apiUrl).success(function (data) {
            for (var x = 0; x < data.d.results.length && data.d.results[x].FormType != 4; x++) { }
            if (x < data.d.results.length) {
                var formUrl = data.d.results[x].ServerRelativeUrl;

                var options = {
                    title: data.lookupValue, url: formUrl + "?ID=" + lookupId, width: 500, height: 500, allowMaximize: true, showClose: true, dialogReturnValueCallback: function (dialogResult, returnValue) {
                        SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.RefreshPage', SP.UI.DialogResult.OK);
                    }
                };

                SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
            }
        });
    };

    //Hover event callback to show the documents panel
    self.ShowDocuments = function (data, event) {
        var element = event.delegateTarget;
        if (!jQuery(element).hasClass("AssociatedDocumentsContainer"))
            element = jQuery(element).parent(".AssociatedDocumentsContainer");

        //unbind the default mouseover event to bind the jQuery mouseenter event
        jQuery(element).unbind("mouseover");
        jQuery(element).mouseenter(function () {
            jQuery(".DocumentsList").hide();
            jQuery(this).find(".DocumentsList").filter(':not(:animated)').show(200);
        });

        jQuery(element).mouseenter();
    };

    //Hover event callback to hide he documents panel
    self.HideDocuments = function (data, event) {
        var element = event.delegateTarget;
        if (!jQuery(element).hasClass("AssociatedDocumentsContainer"))
            element = jQuery(element).parent(".AssociatedDocumentsContainer");

        //unbind the default mouseout event to bind te jQuery mouseout event
        jQuery(element).unbind("mouseout");
        jQuery(element).mouseleave(function () {
            jQuery(this).find(".DocumentsList").filter(':not(:animated)').hide(200);
        });

        jQuery(element).mouseleave();
    };
};

//Create SharePoint REST API shorthand
(function ($) {
    $.SP = {};
    $.SP.ajax = function (apiUrl) {
        return jQuery.ajax({
            url: apiUrl,
            method: "GET",
            headers: { "accept": "application/json;odata=verbose" }
        });
    };
}(jQuery));

//Register view callbacks
(function () {
    if (typeof SPClientTemplates === 'undefined')
        return;

    var fieldCtx = {};
    fieldCtx.Templates = {};
    fieldCtx.Templates.Fields = {
        'AssociatedDocuments': {
            'View': AssociatedDocuments.View
        }
    };

    SPClientTemplates.TemplateManager.RegisterTemplateOverrides(fieldCtx);
})();