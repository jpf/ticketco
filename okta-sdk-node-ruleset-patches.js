const Collection = require('@okta/okta-sdk-nodejs/src/collection');
const ModelFactory = require('@okta/okta-sdk-nodejs/src/model-factory');
const Resource = require('@okta/okta-sdk-nodejs/src/resource');

class RuleSet extends Resource {
  constructor(resourceJson, client) {
    super(resourceJson, client);
  }

  delete() {
    return this.client.deleteRuleSet(this.id);
  }

  addRule(rule) {
    rule.rulesetId = this.id;
    // console.log(`for ruleset id: ${this.id} we are adding this rule: ${JSON.stringify(rule)}`);
    return this.client.ruleSetAddRule(this.id, rule);
  }

  addMapping(oidcApp) {
    // console.log(`mapping OIDC app ${oidcApp.id} ruleset id: ${this.id}`);
    return this.client.ruleSetAddMapping(this.id, oidcApp.id);
  }
}

exports.apply = (client) => {
  client.createRuleSet = function (ruleSet) {
    let url = `${this.baseUrl}/api/v1/rulesets`;
    const resources = [url];

    const request = this.http.postJson(url, {
      body: ruleSet
    }, {resources});
    return request.then(jsonRes => new RuleSet(jsonRes, this));
  }

  client.ruleSetAddMapping = function(ruleSetId, oidcAppId) {
    let url = `${this.baseUrl}/api/v1/rulesets/${ruleSetId}/mappings`;
    const resources = [url];

    const request = this.http.postJson(url, {
      body: {
        "resourceType": "APP",
        "resourceId": oidcAppId
      }
    }, {resources});
    return request
  }

  client.ruleSetAddRule = function(ruleSetId, rule) {
    let url = `${this.baseUrl}/api/v1/rulesets/${ruleSetId}/rules`;
    const resources = [url];

    const request = this.http.postJson(url, {
      body: rule
    }, {resources});
    return request
      // .then(rv => console.log(rv))
}

  client.listRuleSets = function () {
    let url = `${this.baseUrl}/api/v1/rulesets`;
    
    return new Collection(this, url, new ModelFactory(RuleSet));
  }

  client.deleteRuleSet = function (ruleSetId) {
    let url = `${this.baseUrl}/api/v1/rulesets/${ruleSetId}`;
    const resources = [
      `${this.baseUrl}/api/v1/rulesets/${ruleSetId}`
    ];

    const request = this.http.delete(url, null, {resources});
    return request;
  }
 
}
