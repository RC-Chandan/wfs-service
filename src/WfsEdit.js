let axios = require("axios");
let xml = require("xml");
let geoJsonToGml = require("./geoJsonToGml");

(function(window, axios, xml, geoJsonToGml) {
  "user strict";

  let VERSION = "0.0.1";
  let HOST = "http://localhost:19090";

  if(axios === "undefined")
    throw new Error("axios lib not found");

  if(xml === "undefined")
    throw new Error("xml lib not found");

  let _getTransactionXmlJson = function (operation, WFSOperationBaseXML) {

    let transactionXML = null;
    if(operation.toLowerCase() === "insert"){
        transactionXML = {
        "Transaction": [
          {
            "_attr": {
              "service": "WFS",
              "version": "1.0.0",
              "xmlns": "http://www.opengis.net/wfs",
              "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
              "xsi:schemaLocation": "http://www.vizexperts.com/",
              "xmlns:gml": "http://www.opengis.net/gml",
              "xmlns:georbis": "http://www.vizexperts.com/"
            }
          },
          // OperationXML will be pushed here
        ]
      };

        transactionXML["Transaction"].push(WFSOperationBaseXML);
      }else {
          transactionXML = {
          "wfs:Transaction": [
            {
              "_attr": {
                "service": "WFS",
                "version": "1.0.0",
                "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                "xsi:schemaLocation": "http://www.opengis.net/wfs",
                "xmlns:gml": "http://www.opengis.net/gml",
                "xmlns:wfs": "http://www.opengis.net/wfs",
                "xmlns:ogc": "http://www.opengis.net/ogc"
              }
            },
            // OperationXML will be pushed here
          ]
        };
        transactionXML["wfs:Transaction"].push(WFSOperationBaseXML);
      }

      return transactionXML;
  };

  let _buildFilterXML = function (fid) {
    let filterQuery = {
      "ogc:Filter": [
        {
          "_attr": {
          }
        },
        {
          "FeatureId": [{
            "_attr": {
              "fid": [fid]
            }
          }]
        }
      ]
    };
    return filterQuery;
  }

  let _buildUpdateFeatureXML = function (feature) {
    var propertyXML = {"wfs:Property": [{"_attr": {}}]};
    propertyXML["wfs:Property"].push({"wfs:Name": feature.name});
    propertyXML["wfs:Property"].push({"wfs:Value": feature.value});
    return propertyXML;
  }

  let _buildInsertFeatureXML = function (geoJson, typeName) {
    return geoJsonToGml.convertToGml(geoJson, typeName);
  }

  let _buildOpertaionXML = function (operation, typeName, fid, geoJson) {
    let operationXML, filterQuery, featureQuery;
    if(typeof fid !== "undefined") {
      filterQuery = _buildFilterXML(fid);
    }

    if(typeof geoJson !== "undefined" && operation.toLowerCase() === "insert")
      gmlQuery = _buildInsertFeatureXML(geoJson, typeName);

    switch (operation.toLowerCase()) {
      case "insert":
        operationXML = {"Insert": [{"_attr": {"xmlns": "http://www.opengis.net/wfs"}}]};
        operationXML["Insert"].push(gmlQuery);
        break;
      case "update":
        operationXML = {"wfs:Update": [{"_attr": {"typeName": typeName}}]};
        let properties = geoJson.features[0].properties;
        for(prop in properties) {
          if(properties.hasOwnProperty(prop)){
            gmlQuery = _buildUpdateFeatureXML((function (geoJson, prop) {
              let featureObj = {name: prop, value: properties[prop]};
              return featureObj;
            }(properties, prop)));
            operationXML["wfs:Update"].push(gmlQuery);
          }
        }

        if(typeof geoJson.features[0].geometry === "object") {
          let geom = geoJson.features[0].geometry;
          let vectorType = geom.type;
          let geomQuery = geoJsonToGml.getGeomXmlJson(vectorType, geom);
          console.log(JSON.stringify(geomQuery));
          operationXML["wfs:Update"].push(_buildUpdateFeatureXML({name: "geom", value: [geomQuery.geom[1]]}));
        }

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

  let _createWFSRequest = function (operation, typeName, fid, geoJson) {
    let WFSOperationBaseXML = _buildOpertaionXML(operation, typeName, fid, geoJson, typeName);
    let WFSTransactionRequestXML = _getTransactionXmlJson(operation, WFSOperationBaseXML);
    console.log(xml(WFSTransactionRequestXML, true));
    return xml(WFSTransactionRequestXML, true);
  }

  let insertFeature = function (typeName, geoJson) {
    let reqBody = _createWFSRequest("Insert", typeName, undefined, geoJson);
    let url = HOST + "/wfs";
    let params = {
      data: reqBody,
    }

    let xhr = axios.create({
      headers: {'Content-Type': 'application/xml'}
    });

    xhr.post(url, reqBody)
    .catch(function(error) {
      console.log(error);
    });
  }

  let updateFeature = function (typeName, fid, geoJson) {
    let reqBody = _createWFSRequest("Update", typeName, fid, geoJson);
    let url = HOST + "/wfs";
    let params = {
      data: reqBody,
    }
    let xhr = axios.create({
      headers: {'Content-Type': 'application/xml'}
    });

    xhr.post(url, reqBody)
    .catch(function(error) {
      console.log(error);
    });
  }


  let deleteFeature = function (typeName, fid) {
    let reqBody = _createWFSRequest("Delete", typeName, fid, undefined);
    let url = HOST + "/wfs";
    let params = {
      data: reqBody,
    }
    let xhr = axios.create({
      headers: {'Content-Type': 'application/xml'}
    });

    xhr.post(url, reqBody)
    .catch(function(error) {
      console.log(error);
    });
  }

  let WFSEdit = {};
  WFSEdit.insert = insertFeature;
  WFSEdit.update = updateFeature;
  WFSEdit.delete = deleteFeature;

  window.WFSEdit = WFSEdit;

})(window, axios, xml, geoJsonToGml);