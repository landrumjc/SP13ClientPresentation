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

$j = jQuery.noConflict();

function MyTasksViewModel() {
    var self = this;
    self.Filter = ko.observable("");
    self.Filter.subscribe(function (newValue) {
        self.LoadPagedData(true);
    });
    self.Data = ko.observableArray();
    self.TotalRows = ko.observable();
    self.CurrentUser = ko.observable();
    self.SearchFields = ['SPSiteURL', 'SitePath', 'Path', 'Title', 'DueDate', 'DueDateOWSDATE', 'PercentComplete', 'AssignedTo', 'AssignedToOWSUSER', 'PercentCompleteOWSNMBR'];
    self.SortField = 'DueDate:descending';
    self.PercentCompleteFilter = ko.observable("0.01..0.99");

    self.CurrentRequests = 0;
    self.LoadPagedData = function (clearData) {
        if (!self.CurrentUser()) {
            $j.SP.ajax("/_api/web/currentuser/LoginName").success(function (data) {
                self.CurrentUser(data.d.LoginName);
                self.LoadPagedData(clearData);
            });
            return;
        }

        if (clearData)
            self.Data.removeAll();

        var request = ++self.CurrentRequests;
        $j.SP.ajax("/_api/search/query?querytext='" + self.Filter() + "* ContentType:Task AssignedToOWSUSER:" + encodeURIComponent(self.CurrentUser()) + " PercentComplete=" + self.PercentCompleteFilter() + "'&startrow=" + self.Data().length + "&selectproperties='" + self.SearchFields.join() + "'&sortlist='" + self.SortField + "'").success(function (data) {
            if (request == self.CurrentRequests)
                self.CurrentRequests = 0;
            else
                return;

            if (!data || !data.d)
                return;
            var query = data.d.query;
            if (!query.PrimaryQueryResult || !query.PrimaryQueryResult.RelevantResults) {
                return;
            }

            self.TotalRows(query.PrimaryQueryResult.RelevantResults.TotalRows);
            var results = query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
            if (results.length == 0)
                return;

            for (var x = 0; x < results.length; x++) {
                var cells = results[x].Cells.results;
                var resultObj = {};
                for (var y = 0; y < cells.length; y++) {
                    resultObj[cells[y].Key] = cells[y].Value;
                }
                self.Data.push(resultObj);
            }

            console.log(self.Data());
            var contentHeight = $j("#container").height();
            var viewHeight = $j(window).height() + $j(window).scrollTop();

            if (contentHeight < viewHeight + 30)
                self.LoadPagedData();
        });
    };

    self.ChangeFilter = function (data, event) {
        var jElem = $j(event.originalEvent.srcElement);
        if (jElem.parent().hasClass("active"))
            return;

        var filter = jElem.attr("PercentFilter");
        self.PercentCompleteFilter(filter);
        jElem.parents("ul").find("li").removeClass("active");
        jElem.parent().addClass("active");

        self.LoadPagedData(true);
    };

    self.DateIsPassed = function (date) {
        var parseDate = new Date(Date.parse(date));
        return parseDate < (new Date());
    };

    self.ParseDate = function (date) {
        var parseDate = new Date(Date.parse(date));
        return parseDate.toLocaleDateString();
    };

    $j(window).scroll(function () {
        var contentHeight = $j("#container").height() + $j("#container").offset().top;
        var viewHeight = $j(window).height() + $j(window).scrollTop();

        if (contentHeight < viewHeight + 30)
            self.LoadPagedData();
    });

    self.LoadPagedData();
}