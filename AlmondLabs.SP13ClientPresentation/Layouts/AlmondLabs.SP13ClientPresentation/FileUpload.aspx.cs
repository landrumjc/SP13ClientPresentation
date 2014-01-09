using System;
using System.Linq;
using Microsoft.SharePoint;
using Microsoft.SharePoint.WebControls;
using System.Collections.Generic;
using System.Web;
using System.IO;
using System.Threading;

namespace AlmondLabs.SP13ClientPresentation
{
    public partial class FileUpload : LayoutsPageBase
    {
        protected class FileStatus
        {
            public double Progress;
            public string Error;
        }

        private static Dictionary<string, Dictionary<string, FileStatus>> _uploadingFiles;
        private static Dictionary<string, FileStatus> UploadingFiles
        {
            get
            {
                string currentUserName = HttpContext.Current.User.Identity.Name;
                if (_uploadingFiles == null)
                    _uploadingFiles = new Dictionary<string, Dictionary<string, FileStatus>>();

                Dictionary<string, FileStatus> currentUserFiles = null;
                if (!_uploadingFiles.ContainsKey(currentUserName))
                    _uploadingFiles.Add(currentUserName, new Dictionary<string, FileStatus>());

                currentUserFiles = _uploadingFiles[currentUserName];

                return currentUserFiles;
            }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            string fileName = string.Empty;
            if (!string.IsNullOrEmpty((fileName = HttpUtility.UrlDecode(Request.QueryString["Status"]))))
            {
                if (UploadingFiles.ContainsKey(fileName))
                {
                    FileStatus status = UploadingFiles[fileName];
                    if (string.IsNullOrEmpty(status.Error))
                    {
                        Response.Write(UploadingFiles[fileName].Progress);
                        Response.End();
                    }
                    else
                    {
                        Response.Write(string.Format("error{0}", status.Error));
                        Response.End();
                    }
                }
                else
                {
                    Response.Write(0);
                    Response.End();
                }

                return;
            }

            if (Request.Files.Count > 0)
            {
                UploadingFiles.Clear();
                HttpFileCollection files = Request.Files; // Load File collection into HttpFileCollection variable.
                string[] arr1 = files.AllKeys;  // This will get names of all files into a string array.
                int totalContentLength = 0;
                for (int x = 0; x < arr1.Length; x++)
                {
                    totalContentLength += files[arr1[x]].ContentLength;
                }

                int totalWritten = 0;

                int itemId = Int32.Parse(Request.QueryString["itemId"]);
                Guid listId = new Guid(Request.QueryString["listId"]);
                Guid fieldId = new Guid(Request.QueryString["fieldId"]);
                Guid targetWebId = new Guid(Request.QueryString["targetWebId"]);
                Guid targetListId = new Guid(Request.QueryString["targetListId"]);
                List<int> newIds = new List<int>();

                using (SPWeb targetWeb = SPContext.Current.Site.OpenWeb(targetWebId))
                {
                    targetWeb.AllowUnsafeUpdates = true;
                    SPList targetList = targetWeb.Lists[targetListId];

                    for (int x = 0; x < arr1.Length; x++)
                    {
                        try
                        {
                            fileName = files[arr1[x]].FileName;
                            if (UploadingFiles.ContainsKey(fileName))
                                UploadingFiles.Remove(fileName);

                            UploadingFiles.Add(fileName, new FileStatus { Error = "", Progress = 0 });

                            Stream fileStream = files[arr1[x]].InputStream;

                            byte[] buffer = new byte[5120];
                            int offset = 0;
                            int count = 0;

                            MemoryStream file = new MemoryStream();
                            while ((count = fileStream.Read(buffer, 0, 5120)) > 0)
                            {
                                offset += count;
                                file.Write(buffer, 0, count);
                                totalWritten += count;

                                double progress = ((double)totalWritten / (double)totalContentLength);
                                if (progress == 1)
                                    progress = progress - .01;
                                UploadingFiles[fileName].Progress = progress;
                                //Thread.Sleep(5);
                            }

                            file.Position = 0;
                            SPFile spFile = targetList.RootFolder.Files.Add(fileName, file);
                            newIds.Add(spFile.Item.ID);

                            if (string.IsNullOrEmpty((string)spFile.Item["Title"]))
                            {
                                spFile.Item["Title"] = spFile.Name;
                                spFile.Item.Update();
                            }

                            UploadingFiles[fileName].Progress = 1;
                            file.Close();
                            fileStream.Close();
                        }
                        catch (Exception exc)
                        {
                            UploadingFiles[fileName].Error = exc.Message;
                        }
                    }
                    targetWeb.AllowUnsafeUpdates = false;
                }

                if (newIds.Count > 0)
                {
                    SPContext.Current.Web.AllowUnsafeUpdates = true;
                    SPList sourceList = SPContext.Current.Web.Lists[listId];
                    SPListItem currentItem = sourceList.GetItemById(itemId);

                    SPFieldLookupValueCollection vals = (SPFieldLookupValueCollection)currentItem[fieldId];
                    vals.AddRange(newIds.Select(id => new SPFieldLookupValue { LookupId = id }));

                    currentItem[fieldId] = vals;
                    currentItem.Update();

                    SPContext.Current.Web.AllowUnsafeUpdates = false;
                }

                Response.End();
            }
        }
    }
}
