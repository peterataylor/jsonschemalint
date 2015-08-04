'use strict';

var app = angular.module('app', false);

app.controller('validatorController', function ($scope, $http, $window) {

    var validator = $window['isMyJsonValid'];
    var YAML = $window['YAML'];
    var tv4 = $window['tv4'];

    var self = this;

    // Load the meta-schema
    $http.get('meta-schema/schema.json').success(function (data) {
        self.metaSchema = data;
    });

    $http.get('http://raw.githubusercontent.com/peterataylor/om-json/master/Common.json').success(function (data) {
        tv4.addSchema('http://raw.githubusercontent.com/peterataylor/om-json/master/Common.json', data);
    });

    $http.get('http://raw.githubusercontent.com/peterataylor/om-json/master/Observation.json').success(function (data) {
        tv4.addSchema('http://raw.githubusercontent.com/peterataylor/om-json/master/Observation.json', data);
    });

    $http.get('http://raw.githubusercontent.com/peterataylor/om-json/master/Sampling.json').success(function (data) {
        tv4.addSchema('http://raw.githubusercontent.com/peterataylor/om-json/master/Sampling.json', data);
    });
    
    $http.get('http://raw.githubusercontent.com/peterataylor/om-json/master/TimeseriesMetadata.json').success(function (data) {
        tv4.addSchema('http://raw.githubusercontent.com/peterataylor/om-json/master/TimeseriesMetadata.json', data);
    });

    $http.get('http://raw.githubusercontent.com/peterataylor/om-json/master/TimeseriesTVP.json').success(function (data) {
        tv4.addSchema('http://raw.githubusercontent.com/peterataylor/om-json/master/TimeseriesTVP.json', data);
    });

    $http.get('http://gist.githubusercontent.com/peterataylor/47bcd797e0ef3ac92341/raw/fb6e7428791e9afa6c8c05c5be1f5a20c8e043c1/geometry.json').success(function (data) {
        tv4.addSchema('http://gist.githubusercontent.com/peterataylor/47bcd797e0ef3ac92341/raw/fb6e7428791e9afa6c8c05c5be1f5a20c8e043c1/geometry.json', data);
    });

    this.reset = function() {
      self.document = "";
      self.schema = "";
    };

    this.sample = function(schema, instance) {
      console.debug('sample', instance + '+' + schema);
      var repoURL = 'https://raw.githubusercontent.com/peterataylor/om-json/master/';

      $http.get(repoURL + instance + '.json').success(function(data) {
          self.document = JSON.stringify(data, null, '  ');
      });
      $http.get(repoURL + schema + '.json').success(function(data) {
          self.schema = JSON.stringify(data, null, '  ');
      });

    };

    this.parseMarkup = function(thing) {
      try {
        return JSON.parse(thing);
      } catch (e) {
        console.log('not json, trying yaml');
        return YAML.parse(thing);
      }
    };

    this.reformatMarkup = function(thing) {
      try {
        return JSON.stringify(JSON.parse(thing), null, '  ');
      } catch (e) {
        return YAML.stringify(YAML.parse(thing), 4, 2);
      }
    };

    this.formatDocument = function() {
      console.debug('formatDocument');

      try {
        var documentObject = this.parseMarkup(self.document);
        this.document = this.reformatMarkup(self.document);
      } catch (e) {
        // *shrug*
      }
    };

    this.formatSchema = function() {
      console.debug('formatSchema');

      try {
        var schemaObject = this.parseMarkup(self.schema);
        this.schema = this.reformatMarkup(self.schema);
      } catch (e) {
        // *shrug*
      }
    };

    this.validateDocument = function () {
        console.debug("document");
        self.documentErrors = [];
        self.documentMessage = "";

        // Parse as JSON
        try {
          self.documentObject = this.parseMarkup(self.document);

          var valid = tv4.validate(self.documentObject, this.schemaObject);
          if (!valid) {
            if (tv4.error) {
              self.documentErrors = [ {"message": tv4.error.message, 
                  "field": tv4.error.schemaPath,
                  "value": tv4.error.dataPath}];
            }
            if (tv4.missing.length != 0) {
              self.documentErrors = [ {"message": "missing remote schema: " + tv4.missing[0], 
                  "field": "$ref",
                  "value": tv4.missing[0]
              }];
            }
          } else {
            self.documentMessage = "Document conforms to the JSON schema.";
          }
      } catch (e) {
        // Error parsing as JSON
        self.documentErrors = [{message: "Document is invalid JSON. Try http://jsonlint.com to fix it." }];
      }
    };

    this.validateSchema = function () {
      console.debug("schema");
      self.schemaErrors = [];
      self.schemaMessage = "";

      // Parse as JSON
      try {
        self.schemaObject = this.parseMarkup(self.schema);

        // Can't be done if we don't have the meta schema yet
        if (!this.metaSchema) {
          return;
        }

        // Do validation
        var schemaValidator = validator(this.metaSchema, {
            verbose: true
        });
        schemaValidator(this.schemaObject);
        console.log(schemaValidator.errors)
        if (schemaValidator.errors && schemaValidator.errors.length) {
          this.schemaErrors = schemaValidator.errors;
        } else {
          this.schemaMessage = "Schema is a valid JSON schema.";
        }
      } catch (e) {
        // Error parsing as JSON
        self.schemaErrors = [{ message: "Schema is invalid JSON. Try http://jsonlint.com to fix it." }];
      }

    };

    // Document changes
    $scope.$watch(function () {
        return self.document;
      }, function (newValue, oldValue) {
        self.validateDocument();
    });

    // Schema changes
    $scope.$watch(function () {
        return self.schema;
      }, function (newValue, oldValue) {
        self.validateSchema();
        self.validateDocument();
    });

});
