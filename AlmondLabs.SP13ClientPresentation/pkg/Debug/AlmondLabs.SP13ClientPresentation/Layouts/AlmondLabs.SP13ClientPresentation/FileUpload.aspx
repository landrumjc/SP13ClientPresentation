<%@ Assembly Name="AlmondLabs.SP13ClientPresentation, Version=1.0.0.0, Culture=neutral, PublicKeyToken=9c76461f3aa408a6" %>
<%@ Import Namespace="Microsoft.SharePoint.ApplicationPages" %>
<%@ Register Tagprefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register Tagprefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register Tagprefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="FileUpload.aspx.cs" Inherits="AlmondLabs.SP13ClientPresentation.FileUpload" %>

<html>    
    <head>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js"></script>
        <script src="https://ajax.aspnetcdn.com/ajax/knockout/knockout-2.2.1.js"></script>
        <link href="https://netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.no-icons.min.css" rel="stylesheet" />
		<style type="text/css">
			body {
				padding:20px;
			}
			
			.FormContainer {
				width: 375px;
			}
			
			.Link {
				cursor: pointer;
			}
			
			.FileForm {
				height:0px;
				overflow:hidden;
				margin:0px;
			}
			
			input.FileInput {
				height:30px !important;
				width:166px;
			}
			
			.iFrameContainer {
				height:0px;
				overflow:hidden;
			}
			
			.DocIconContainer {
				display:inline-block;
				height:40px;
				width:40px;
				margin-left:7px;
			}
			
			.DocIcon {
				height:40px;
				max-height:40px;
				margin-top:-10px;
			}

		    .AddLink {
		        float: right;
		        padding-top: 6px;
		    }
			
			.UploadAction {
				float:right;
				padding-top:6px;
			}
			
			.alert-success {
				background:none;
			}
		</style>
    </head>
    <body>
		<div class="FormContainer">
			<!-- ko template: { name: 'UploadTemplate', foreach: Files }  -->

			<!-- /ko -->
			<div>
				<a class="AddLink Link" data-bind="click: AddFile">Add file +</a>
				<input class="btn btn-primary" type="button" data-bind="click: SubmitForm, enable: !Uploading()" value="Upload" />
			</div>
		</div>
        
        <script type="text/html" id="UploadTemplate">
            <div class="FileContainer">
                <form class="FileForm" data-bind="attr: { action : $root.RemoveHost(window.location.href) }" method="post" enctype="multipart/form-data">
                    <input type="file" data-bind="value: File, attr: { name : 'FileUpload' + $index(), id : 'FileUpload' + $index() }" />
                </form>
				<div data-bind="visible:!Error()">
					<div class="FileUpload">
						<span class="input-prepend">
							<span class="add-on">
								<a class="Link" data-bind="visible: !$root.Uploading() && !Uploaded(), click: $root.IsFirefox() ? function() { $root.UploadClick($index()); } : null"><label class="Link" data-bind="attr: {for: 'FileUpload' + $index()}">Browse</label></a>
								<span data-bind="visible: $root.Uploading() || Uploaded()">Browse</span>
							</span>
							<input class="FileInput span2" type="text" data-bind="value:FileName, enable: false">
						</span>
						<span class="DocIconContainer"><img class="DocIcon" data-bind="attr: { src : DocIcon() ? DocIcon() : '/_layouts/15/images/blank.gif' }" /></span>
						<span class="UploadAction"><a class="Link" data-bind="click: $root.DeleteFile, visible: !Uploading()">Remove</a><span data-bind="visible: Uploaded" class="alert-success">Completed</span></span>
					</div>
					<div class="iFrameContainer"></div>
					<div class="ProgressContainer" >
						<div class="progress">
							<div class="bar" style="width: 0%"></div>
						</div>
					</div>
				</div>
				<div class="alert alert-error" data-bind="visible:Error, text:Error">
					error!
				</div>
            </div>
        </script>

        <script type="text/javascript">

            function UploadModel() {
                var self = this;
                self.File = function () {
                    var file = this;
                    file.File = ko.observable("");
                    file.DocIcon = ko.observable();
                    file.Uploading = ko.observable(false);
                    file.Uploaded = ko.observable(false);
                    file.Error = ko.observable();

                    file.FileName = ko.computed(function () {
                        var parts = file.File().split("\\");
                        return parts[parts.length - 1];
                    }, this);

                    file.File.subscribe(function (newValue) {
                        var parts = newValue.split(".");
                        var fileExt = parts[parts.length - 1];
                        var iconUrl = "/_layouts/15/images/256_IC" + fileExt + ".PNG";

                        $.get(iconUrl).success(function () {
                            file.DocIcon(iconUrl);
                        }).fail(function () {
                            file.DocIcon(null);
                        });
                    });
                };

                self.Files = ko.observableArray([new self.File()]);
                self.Uploading = ko.observable(false);
                self.UploadIndex = 0;
                self.UploadForms = [];

                self.IsFirefox = ko.observable(typeof InstallTrigger !== 'undefined');

                self.UploadClick = function (index) {
                    $($(".FileContainer")[index]).find("input[type='file']").click();
                };

                self.DeleteFile = function (file) {
                    self.Files.remove(file);
                };

                self.AddFile = function () {
                    self.Files.push(new self.File());
                };

                self.SubmitForm = function () {
                    self.Uploading(true);
                    self.UploadIndex = 0;
                    self.UploadForms = $(".FileContainer");
                    self.UploadFile();
                };

                self.UploadFile = function () {
                    var form;
                    //skip already processed forms
                    while (self.UploadIndex < self.UploadForms.length && ((form = $(self.UploadForms[self.UploadIndex]).find("form")).length == 0 || (form.find("input").val().length == 0))) {
                        self.UploadIndex++;
                    }

                    if (self.UploadIndex < self.UploadForms.length) {
                        var container = form.parent();
                        var iframeContainer = container.find(".iFrameContainer")[0];
                        var iframe = document.createElement("iframe");
                        iframeContainer.appendChild(iframe);
                        iframe.contentWindow.document.open();
                        iframe.contentWindow.document.close();
                        var contents = $(iframe).contents().find("body")[0].appendChild(form[0]);
                        var iForm = $(iframe).contents().find("form");
                        iForm.submit();
                        var progressBar = container.find(".bar");
                        var file = self.Files()[self.UploadIndex];
                        file.Uploading(true);
                        var fileName = file.FileName();
                        self.UpdateProgress(progressBar, fileName);
                    }
                    else {
                        self.Uploading(false);
                    }
                };

                self.UpdateProgress = function (progressBar, fileName, previousData) {
                    var statusQs = "Status=" + encodeURIComponent(fileName);
                    if (window.location.href.match("\\?")) {
                        statusQs = "&" + statusQs;
                    }
                    else {
                        statusQs = "?" + statusQs;
                    }

                    $.get(window.location.href + statusQs).success(function (data) {
                        var currentFile = self.Files()[self.UploadIndex];
                        if (data.toLowerCase().match("error")) {
                            var error = data.toLowerCase().replace("error", "");
                            currentFile.Error(error);
                            self.UploadIndex++;
                            self.UploadFile();
                        }
                        else if (data == 1) {
                            self.UploadIndex++;
                            currentFile.Uploaded(true);
                            progressBar.stop();
                            progressBar.animate({ width: "100%" }, 50);
                            progressBar.addClass("bar-success");
                            self.UploadFile();
                        }
                        else {
                            if (data != previousData) {
                                progressBar.stop();
                                progressBar.animate({ width: (data * 100) + "%" }, 50);
                            }
                            setTimeout(function () {
                                self.UpdateProgress(progressBar, fileName, data);
                            }, 200);
                        }
                    });
                };

                self.RemoveHost = function (url) {
                    var index = 0;
                    for (var x = 0; x < 3; x++) {
                        index = url.indexOf("/", index + 1);
                    }

                    return url.substring(index);
                };
            }

            $(document).ready(function () {
                $.ajaxSetup({ cache: false, accept: "application/json; odata=verbose" });
            });

            ko.applyBindings(new UploadModel());
        </script>
    </body>
</html>



