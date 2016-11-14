var axios = require("axios");
var xml = require("xml");
var geoJsonToGml = require("./geoJsonToGml");

(function(window, axios, xml) {
  "user strict";

  var VERSION = "0.0.1";
  var HOST = "http://localhost:19090";

  if(axios === "undefined")
    throw new Error("axios lib not found");

  if(xml === "undefined")
    throw new Error("xml lib not found");


    var buildBaseTransactionXML = function () {
     return  {
        "wfs:Transaction": [
          {
            "_attr": {
              "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
              "xsi:schemaLocation": "http://www.opengis.net/wfs",
              "xmlns:gml": "http://www.opengis.net/gml",
              "xmlns:wfs": "http://www.opengis.net/wfs",
              "xmlns:ogc": "http://www.opengis.net/ogc",
              "xmlns:georbis": "http://www.vizexperts.com/",
              "service": "WFS",
              "version": "1.0.0"
            }
          }
        ]
      }
    };

    function buildFilterXML(filter) {

      var filterQuery = {
        "ogc:Filter": [
          {
            "_attr": {

            }
          },
          {
            "PropertyIsEqualTo": [
              {
                "_attr": {

                }
              },
              {
                "PropertyName": filter.propertyName
              },
              {
                "Literal": filter.literal
              }
            ]
          }
        ]
      };

      return filterQuery;
    }

    function buildUpdateFeatureXML(feature) {
      var propertyXML = {"wfs:Property": [{"_attr": {}}]};
      for(prop in feature) {
        if(feature.hasOwnProperty(prop)){
          var value = feature[prop];
          propertyXML["wfs:Property"].push({"wfs:Name": prop});
          propertyXML["wfs:Property"].push({"wfs:Value": value});
        }
      }
      return propertyXML;
    }

    function buildInsertFeatureXML(geoJson) {

      return geoJsonToGml(geoJson);
    }

    function buildOpertaionXML(operation, typeName, filter, feature) {
      var operationXML, filterQuery, featureQuery;
      if(typeof filter !== "undefined") {
        filterQuery = buildFilterXML(filter);
      }

      if(typeof feature !== "undefined" && operation.toLowerCase() === "update")
        featureQuery = buildUpdateFeatureXML(feature);

      if(typeof feature !== "undefined" && operation.toLowerCase() === "insert")
        featureQuery = buildInsertFeatureXML(feature);

      switch (operation.toLowerCase()) {
        case "insert":
          operationXML = {"wfs:Insert": [{"_attr": {}}]};
          operationXML["wfs:Insert"].push(featureQuery);
          break;
        case "update":
          operationXML = {"wfs:Update": [{"_attr": {typeName: typeName}}]};
          operationXML["wfs:Update"].push(featureQuery);
          operationXML["wfs:Update"].push(filterQuery);
          break;
        case "delete":
          operationXML = {"wfs:Delete": [{"_attr": {typeName: typeName}}]};
          operationXML["wfs:Delete"].push(filterQuery);
          break;
        default:
          console.log("default");
      }

      return operationXML;
    }


    function createWFSRequest(operation, typeName, filter, geoJson) {
      var WFSTransactionRequestXML = buildBaseTransactionXML();
      var WFSOperationBaseXML = buildOpertaionXML(operation, typeName, filter, geoJson);
      WFSTransactionRequestXML["wfs:Transaction"].push(WFSOperationBaseXML);

      // console.log(WFSTransactionRequestXML);
      return xml(WFSTransactionRequestXML, true);
    }

    function insertFeature(geoJson) {
      var reqBody = createWFSRequest("Insert", undefined, undefined, geoJson);
      console.log(reqBody);

      var url = HOST + "/wfs";
      var params = {
        data: reqBody,
      }

      var xhr = axios.create({
        headers: {'Content-Type': 'application/xml'}
      });

      // xhr.post(url, reqBody)
      // .catch(function(error) {
      //   console.log(error);
      // });
    }


    function updateFeature(typeName, filter, feature) {
      var reqBody = createWFSRequest("Update", typeName, filter, feature);
      console.log(reqBody);

      var url = HOST + "/wfs";
      var params = {
        data: reqBody,
      }

      var xhr = axios.create({
        headers: {'Content-Type': 'application/xml'}
      });

      xhr.post(url, reqBody)
      .catch(function(error) {
        console.log(error);
      });
    }


    function deleteFeature(typeName, filter) {
      var reqBody = createWFSRequest("Delete", typeName, filter, undefined);
      console.log(reqBody);

      var url = HOST + "/wfs";
      var params = {
        data: reqBody,
      }

      var xhr = axios.create({
        headers: {'Content-Type': 'application/xml'}
      });

      xhr.post(url, reqBody)
      .catch(function(error) {
        console.log(error);
      });
    }



    var WFSEdit = {};
    WFSEdit.insert = insertFeature;
    WFSEdit.update = updateFeature;
    WFSEdit.delete = deleteFeature;

    window.WFSEdit = WFSEdit;


}(window, axios, xml));


// Testing
var typeName= "georbis:world_boundaries";
var filter = { propertyName: "name", literal: "Sri Lanka"};
var feature = {
  pop2005: "20000"
}

 window.WFSEdit.update(typeName, filter, feature);
 // window.WFSEdit.delete(typeName, filter);

var geoJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "marker-color": "#e20808",
        "marker-size": "medium",
        "marker-symbol": "circle"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          58.71093750000001,
          58.63121664342478
        ]
      }
    }
  ]
};

// window.WFSEdit.insert(geoJson);
