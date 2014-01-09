function loadScript(script, scriptFunction) {
    SP.SOD.executeOrDelayUntilScriptLoaded(Function.createDelegate(this, function () {
        var sodLoaded = false;
        if (typeof (_v_dictSod) !== 'undefined' && _v_dictSod[script] == null) {
            SP.SOD.registerSod(script, SP.Utilities.Utility.getLayoutsPageUrl(script));
        }
        else {
            sodLoaded = _v_dictSod[script].state === Sods.loaded;
        }
        if (sodLoaded) {
            Function.createDelegate(this, scriptFunction)();
        }
        else {
            SP.SOD.executeFunc(script, false, Function.createDelegate(this, scriptFunction));
        }
    }), 'core.js');
}

//document rating view model
function SearchRatingViewModel(avgRating, siteUrl, listId, listItemId) {
    var vm = this;
    vm.rating = ko.observable(avgRating);
    vm.site = siteUrl;
    vm.listId = listId;
    vm.itemId = listItemId;
    //invoke update whenever rating value changes
    vm.rating.subscribe(function () {
        loadScript('reputation.js', function () {
            vm.updateRating();
        });
    });

    vm.updateRating = function () {
        var spCtx = new SP.ClientContext(vm.site);
        Microsoft.Office.Server.ReputationModel.Reputation.setRating(spCtx, vm.listId, vm.itemId, vm.rating());
        spCtx.executeQueryAsync(
            function () {
                SP.UI.Notify.addNotification("Thank you for rating this document", false);
            },
            function () {
                SP.UI.Notify.addNotification("There was an error saving your rating", false);
            });

    };
}

//binding handler to control markup
ko.bindingHandlers.starRating = {
    init: function (element, valueAccessor) {
        $(element).addClass("doc-rating");
        for (var i = 0; i < 5; i++)
            $("").appendTo(element);
        $("span", element).each(function (index) {
            $(this).hover(
                function () {
                    $(this).prevAll().add(this).addClass("hoverChosen");
                    $(this).nextAll().addClass("hoverCleared");
                },
                function () {
                    $(this).prevAll().add(this).removeClass("hoverChosen");
                    $(this).nextAll().removeClass("hoverCleared");
                }
            ).click(function () {
                var observable = valueAccessor();
                observable(index + 1);
            });
        });
    },
    update: function (element, valueAccessor) {
        var observable = valueAccessor();
        var decRating = observable() - Math.floor(observable());
        var stars = observable() - decRating;
        $("span", element).each(function (index) {
            if (index < stars) {
                $(this).toggleClass("chosen", true);
            } else if (decRating > 0) {
                $(this).toggleClass("halfChosen", decRating >= 0.25 && decRating <= 0.75);
                $(this).toggleClass("chosen", decRating > 0.75);
                decRating = 0;
            } else
                $(this).toggleClass("chosen", false);
        });
    }
};