using Microsoft.SharePoint;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AL.SP13.Console
{
    class Program
    {
        static void Main(string[] args)
        {
            using (SPSite site = new SPSite("https://sp13.dev.local/sites/demo"))
            {
                using (SPWeb web = site.OpenWeb())
                {
                    SPList list = web.Lists["Tasks"];
                    Random rand = new Random();


                    for (var x = 0; x < 10; x++)
                    {
                        int ind = rand.Next(list.ItemCount);
                        SPListItem item = list.Items[ind];
                        item["PercentComplete"] = 1;
                        item.Update();
                    }

                    /*foreach (SPListItem item in list.Items)
                    {
                        double pc = (double)item["PercentComplete"];
                        if (pc > 1)
                        {
                            double temp = pc / 100.0;
                            System.Console.WriteLine("updatting to: " + temp.ToString());
                            item["PercentComplete"] = temp;
                            item.Update();
                        }
                    }*/

                    /*SPListItem sItem = list.Items[0];
                    SPFieldUserValueCollection users = (SPFieldUserValueCollection)sItem["AssignedTo"];
                    SPFieldUserValue user = users[0];
                    DateTime startDate = DateTime.Now.AddDays(30);
                    for (var x = 0; x < 100; x++)
                    {
                        SPListItem item = list.AddItem();
                        item["Title"] = "Task due " + startDate.ToShortDateString();
                        item["AssignedTo"] = user;
                        item["PercentComplete"] = rand.Next(101);
                        item["DueDate"] = startDate;
                        item.Update();

                        startDate = startDate.AddDays(-1);
                        System.Console.WriteLine("Saved item: " + (x + 1).ToString());
                    }*/
                }
            }
        }
    }
}
