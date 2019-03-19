const Collection = require('@okta/okta-sdk-nodejs/src/collection');
const ModelFactory = require('@okta/okta-sdk-nodejs/src/model-factory');
const Resource = require('@okta/okta-sdk-nodejs/src/resource');

class InlineHook extends Resource {
  constructor(resourceJson, client) {
    super(resourceJson, client);
  }

  deactivate() {
    return this.client.deactivateInlineHook(this.id);
  }
  
  delete() {
    return this.client.deleteInlineHook(this.id);
  }
}


exports.apply = (client) => {
  client.createInlineHook = function(payload) {
    let url = `${this.baseUrl}/api/v1/inlineHooks`;
    const resources = [];

    const request = this.http.postJson(url, {
      body: payload
    }, {resources});
    return request
      .then(jsonRes => new InlineHook(jsonRes, this));
  }

  client.listInlineHooks = function () {
    let url = `${this.baseUrl}/api/v1/inlineHooks`;

    return new Collection(this, url, new ModelFactory(InlineHook));
  }

  client.deactivateInlineHook = function (hookId) {
    let url = `${this.baseUrl}/api/v1/inlineHooks/${hookId}/lifecycle/deactivate`;
    const resources = [ url ];

    const request = this.http.post(url, null, {resources});
    return request
    // .then(jsonRes => new InlineHook(jsonRes, this));
  }

  client.deleteInlineHook = function (ruleSetId) {
    let url = `${this.baseUrl}/api/v1/inlineHooks/${ruleSetId}`;
    const resources = [ url ];

    const request = this.http.delete(url, null, {resources});
    return request;
  }
}
