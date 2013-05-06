module Dashboard {

  export function EditDashboardsController($scope, $routeParams, $route, $location, workspace:Workspace, dashboardRepository:DefaultDashboardRepository) {
    $scope.selectedItems = [];
    $scope.repository = dashboardRepository;

    // TODO for case where we navigate to the add view
    // for some reason the route update event isn't enough...
    // and we need to do this async to avoid the size calculation being wrong
    // bit of a hack - would love to remove! :)
    setTimeout(updateData, 100);

    $scope.hasUrl = () => {
      return ($scope.url) ? true : false;
    };

    $scope.hasSelection = () => {
      return !$scope.selectedItems.length;
    };

    $scope.gridOptions = {
      selectedItems: $scope.selectedItems,
      showFilter: false,
      showColumnMenu: false,
      filterOptions: {
        filterText: ''
      },
      data: 'repository.dashboards',
      selectWithCheckboxOnly: true,
      columnDefs: [
        {
          field: 'title',
          displayName: 'Dashboard',
          cellTemplate: '<div class="ngCellText"><a ng-href="#/dashboard/id/{{row.getProperty(' + "'id'" + ')}}{{hash}}">{{row.getProperty(col.field)}}</a></div>'
        },
        {
          field: 'group',
          displayName: 'Group'
        }
      ]
    };

    // Okay, now this is needed :-)
    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateData, 50);
    });

    $scope.goBack = () => {
      var href = Core.trimLeading($scope.url, "#");
      if (href) {
        $location.url(href);
      }
    };

    $scope.addViewToDashboard = () => {
      var nextHref = null;
      angular.forEach($scope.selectedItems, (selectedItem) => {
        // TODO this could be a helper function
        var text = $scope.url;
        var query = null;
        if (text) {
          var idx = text.indexOf('?');
          if (idx) {
            query = text.substring(idx + 1);
            text = text.substring(0, idx);
          }
          text = Core.trimLeading(text, "#");
        }
        var search = {};
        if (query) {
          var expressions = query.split("&");
          angular.forEach(expressions, (expression) => {
            if (expression) {
              var names = expression.split("=");
              var key = names[0];
              var value = names.length > 1 ? names[1] : null;
              if (value) {
                value = encodeURIComponent(value);
              }
              var old = search[key];
              if (old) {
                if (!angular.isArray(old)) {
                  old = [old];
                  search[key] = old;
                }
                old.push(value);
              } else {
                search[key] = value;
              }
            }
          });
        }
        //console.log("path is: " + text + " the search is " + JSON.stringify(search));
        if ($route && $route.routes) {
          var value = $route.routes[text];
          if (value) {
            /*
             angular.forEach($route.routes, (value, key) => {
             if (key === text) {
             */
            var templateUrl = value["templateUrl"];
            if (templateUrl) {
              if (!selectedItem.widgets) {
                selectedItem.widgets = [];
              }
              var nextNumber = selectedItem.widgets.length + 1;
              var widget = {
                id: "w" + nextNumber, title: "Untitled" + nextNumber, row: nextNumber, col: 1,
                path: Core.trimLeading(text, "/"),
                include: templateUrl,
                search: search,
                hash: ""
              };
              selectedItem.widgets.push(widget);

              if (!nextHref && selectedItem.id) {
                nextHref = "/dashboard/id/" + selectedItem.id
              }

            }
          } else {
            // TODO we need to be able to match URI templates...
          }
        }
      });

      // now lets update the actual dashboard config
      var commitMessage = "Add widget";
      dashboardRepository.putDashboards($scope.selectedItems, commitMessage, Dashboard.onOperationComplete);

      if (nextHref) {
        // remove any dodgy query
        delete $location.search()["href"];
        $location.path(nextHref);
      }
    };

    $scope.create = () => {
      var counter = dashboards().length + 1;
      var id = Core.getUUID();
      var title = "Untitled" + counter;
      var newDash = {id: id, title: title, group: "Personal", widgets: []};

      // TODO how to really add??
      addDashboard(newDash, "Created new dashboard " + title);
    };

    $scope.duplicate = () => {
      angular.forEach($scope.selectedItems, (item, idx) => {
        // lets unselect this item
        $scope.selectedItems = $scope.selectedItems.splice(idx, 1);
        var counter = dashboards().length + 1;
        var id = Core.getUUID();
        var widgets = item.widgets || [];
        var commitMessage = "Duplicated dashboard " + item.title;
        var newDash = {id: id, title: item.title + " Copy", group: item.group, widgets: widgets };
        addDashboard(newDash, commitMessage);
      });
    };

    $scope.delete = () => {
      dashboardRepository.deleteDashboards($scope.selectedItems, Dashboard.onOperationComplete);

      angular.forEach($scope.selectedItems, (item) => {
        dashboards().remove(item);
      });
      $scope.selectedItems.splice(0, $scope.selectedItems.length);
    };


    $scope.gist = () => {
      if ($scope.selectedItems.length > 0) {
        var id = $scope.selectedItems[0].id;
        $location.path("/dashboard/id/" + id + "/share");
      }
    };

    function updateData() {
      var url = $routeParams["href"];
      if (url) {
        $scope.url = decodeURIComponent(url);
      }

      // TODO can we avoid reloading these on startup from the navbar.ts as well?
      dashboardRepository.getDashboards(dashboardLoaded);
    }

    function dashboardLoaded(dashboards) {
      $scope.dashboards = dashboards;
      Core.$apply($scope);
    }

    function addDashboard(newDash, commitMessage) {
      dashboardRepository.putDashboards([newDash], commitMessage, Dashboard.onOperationComplete);
      dashboards().push(newDash);
      $scope.selectedItems.push(newDash);
    }

    function dashboards() {
      return dashboardRepository.dashboards;
    }
  }
}
