webParts = {};
webParts.members = '/_layouts/15/almondlabs.sp13clientpresentation/ko/Members.html';
webParts.editMembers = '/_layouts/15/almondlabs.sp13clientpresentation/ko/EditMembers.html';

ko.bindingHandlers.renderUser = {
    propertyNames: ["PreferredName", "PictureURL", "AccountName", "Title", "WorkEmail", "SipAddress"],
    context: null,
    peopleManager: null,
    callbacks: null,
    timeout: null,
    init: function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var userName = value;
        if (value.userName)
            userName = value.userName;

        var ru = ko.bindingHandlers.renderUser;
        if (ru.context == null) {
            ru.context = clientContext = SP.ClientContext.get_current();
            ru.peopleManager = new SP.UserProfiles.PeopleManager(ru.context);
        }
        if (ru.callbacks == null)
            ru.callbacks = new Array();

        var userProfilePropertiesForUser = new SP.UserProfiles.UserProfilePropertiesForUser(ru.context, userName, ru.propertyNames);
        var userProfileProperties = ru.peopleManager.getUserProfilePropertiesFor(userProfilePropertiesForUser);
        clientContext.load(userProfilePropertiesForUser);
        ru.callbacks[ru.callbacks.length] = function () {
            userProfileProperties.LoginName = userName;
            userProfileProperties.Role = "";
            for (var i = 0; i < ru.propertyNames.length; i++) {
                userProfileProperties[ru.propertyNames[i]] = userProfileProperties[i];
            }
            if (!userProfileProperties.AccountName)
                userProfileProperties.AccountName = userName;
            element.innerHTML = ru.renderPresence(userProfileProperties, value.schemaOverride);
        };
        clearTimeout(ru.timeout);
        ru.timeout = setTimeout(function () {
            ru.context.executeQueryAsync(function () {
                for (var x = 0; x < ru.callbacks.length; x++) {
                    ru.callbacks[x]();
                }
                ru.context = null;
                ru.callbacks = null;
                ru.timeout = null;
                ProcessImn();
            }, function () {
                //handle errors
            });
        }, 1);
    },
    renderPresence: function (user, fieldSchemaOverride) {
        var renderCtx = new ContextInfo();
        renderCtx.Templates = {};
        renderCtx.Templates["Fields"] = {};

        var fieldSchemaData = fieldSchemaOverride;
        if (!fieldSchemaData)
            fieldSchemaData = { "WithPictureDetail": "1", "PictureSize": "Size_36px" };
        var listSchema = { "EffectivePresenceEnabled": "1", "PresenceAlt": "User Presence" };
        var userData = {
            "id": user.AccountName, "department": user.Role, "jobTitle": user.Title,
            "title": user.PreferredName, "email": user.WorkEmail, "picture": user.PictureURL, "sip": user.SipAddress
        };
        return RenderUserFieldWorker(renderCtx, fieldSchemaData, userData, listSchema);
    }
};

ko.bindingHandlers.clientPeoplePicker = {
    currentId: 0,
    init: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable";
        }

        var currentId = ko.bindingHandlers.clientPeoplePicker.currentId++;
        var currentElemId = "ClientPeoplePicker" + currentId;
        element.setAttribute("id", currentElemId);
        obs._peoplePickerId = currentElemId + "_TopSpan";
        ko.bindingHandlers.clientPeoplePicker.initPeoplePicker(currentElemId, obs(), function (elementId, userInfo) {
            var temp = new Array();
            for (var x = 0; x < userInfo.length; x++) {
                temp[temp.length] = userInfo[x].Key;
            }
            obs(temp);
        });
    },
    update: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable";
        }
        if (typeof SPClientPeoplePicker === 'undefined')
            return;

        var peoplePicker = SPClientPeoplePicker.SPClientPeoplePickerDict[obs._peoplePickerId];
        if (peoplePicker) {
            var keys = peoplePicker.GetAllUserKeys();
            keys = keys.length > 0 ? keys.split(";") : [];
            var eKeys = obs() && obs().length ? obs() : [];
            var newKeys = new Array();
            for (var x = 0; x < keys.length; x++) {
                for (var y = 0; y < eKeys.length && eKeys[y] != keys[x]; y++) { }
                if (y >= eKeys.length) {
                    newKeys[newKeys.length] = keys[x];
                }
            }
            if (newKeys.length > 0) {
                var keyStr = newKeys.join(";");
                peoplePicker.AddUserKeys(newKeys.join(";"));
            }
        }
    },
    initPeoplePicker: function (elementId, keys, onValueChanged) {
        var schema = {};
        schema['PrincipalAccountType'] = 'User';
        schema['SearchPrincipalSource'] = 15;
        schema['ResolvePrincipalSource'] = 15;
        schema['AllowMultipleValues'] = true;
        schema['MaximumEntitySuggestions'] = 50;
        //schema['Width'] = '280px'; //use default width

        // Render and initialize the picker. 
        // Pass the ID of the DOM element that contains the picker, an array of initial
        // PickerEntity objects to set the picker value, and a schema that defines
        // picker properties.
        var users = [];
        if (keys && keys.length) {
            var parts = keys;
            for (var x = 0; x < parts.length; x++) {
                users[users.length] = {
                    AutoFillDisplayText: parts[x].split("|")[1],
                    AutoFillKey: parts[x],
                    Description: "",
                    DisplayText: parts[x].split("|")[1],
                    EntityType: "User",
                    IsResolved: true,
                    Key: parts[x],
                    Resolved: true
                };
            }
        }
        SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
            SPClientPeoplePicker_InitStandaloneControlWrapper(elementId, users, schema);
            var picker = SPClientPeoplePicker.SPClientPeoplePickerDict[elementId + "_TopSpan"];
            picker.OnValueChangedClientScript = onValueChanged;
        });
    }
};

ko.bindingHandlers.webPartId = {
    init: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "webPartId binding requires an observable";
        }

        $(element).parents("[webpartid]").each(function () {
            obs($(this).attr("webpartid"));
        });
    }
};

function PeoplePickerMembersViewModel(initUsers) {
    var self = this;
    self.webPartId = ko.observable();
    self.error = ko.observable("");
    self.success = ko.observable("");
    self.curId = PeoplePickerMembersViewModel.curId++;
    self.uniqueName = "KOPeoplePicker_" + self.curId;
    self.userNames = ko.observableArray();

    self.saveUsers = function () {
        getWebPartProperties(self.webPartId()).done(function (wpProps) {
            var content = wpProps.get_item("Content");
            var match = /var options\s*=\s*([^;]*?);/.exec(content);
            if (match)
                content = content.replace(match[1], JSON.stringify(self.userNames()));

            saveWebPartProperties(self.webPartId(), { Content: content }).done(function () {
                self.success("Save successful");
            }).fail(self.error);
        }).fail(self.error);
    };

    SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
        if (initUsers)
            self.userNames(initUsers);
    });
}
PeoplePickerMembersViewModel.curId = 0;

function loadWikiMembers(initUsers) {
    var model = new PeoplePickerMembersViewModel(initUsers);
    var partId = "Element_" + model.uniqueName;
    partId = partId.replace(/[^A-z0-9]+/g, '');
    document.write("<div id='" + partId + "'></div>");
    if (pageInEditMode()) {
        loadWebPart(partId, webParts.editMembers, function () {
            ko.applyBindings(model, document.getElementById(partId));
        }, true);
    }
    else {
        loadWebPart(partId, webParts.members, function () {
            ko.applyBindings(model, document.getElementById(partId));
        }, true);
    }
}

function pageInEditMode() {
    //test if page is in edit mode
    var inEditMode = null;
    if (document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode) {
        inEditMode = document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode.value;
    }
    var wikiInEditMode = null;
    if (document.forms[MSOWebPartPageFormName]._wikiPageMode) {
        wikiInEditMode = document.forms[MSOWebPartPageFormName]._wikiPageMode.value;
    }
    if (!inEditMode && !wikiInEditMode)
        return false;

    return inEditMode == "1" || wikiInEditMode == "Edit";
}

function SPSODAction(sodScripts, onLoadAction) {
    if (SP.SOD.loadMultiple) {
        for (var x = 0; x < sodScripts.length; x++) {
            if (!_v_dictSod[sodScripts[x]]) {
                SP.SOD.registerSod(sodScripts[x], '/_layouts/15/' + sodScripts[x]);
            }
        }
        SP.SOD.loadMultiple(sodScripts, onLoadAction);
    } else
        ExecuteOrDelayUntilScriptLoaded(onLoadAction, sodScripts[0]);
}

function loadWebPart(partId, contentFile, complete, forceLoad) {
    if (pageInEditMode() && !forceLoad) return;

    jQuery(document).ready(function () {
        jQuery('#' + partId).load(contentFile, function () {
            complete();
        });
    });
}