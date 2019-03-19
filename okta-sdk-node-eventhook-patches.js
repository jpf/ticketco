const Collection = require('@okta/okta-sdk-nodejs/src/collection');
const ModelFactory = require('@okta/okta-sdk-nodejs/src/model-factory');
const Resource = require('@okta/okta-sdk-nodejs/src/resource');

class EventHook extends Resource {
  constructor(resourceJson, client) {
    super(resourceJson, client);
  }

  verify() {
    return this.client.verifyEventHook(this.id);
  }
  
  deactivate() {
    return this.client.deactivateEventHook(this.id);
  }
  
  delete() {
    return this.client.deleteEventHook(this.id);
  }
}

exports.apply = (client) => {
  client.listEventHooks = function () {
    let url = `${this.baseUrl}/api/v1/webhooks`;

    return new Collection(this, url, new ModelFactory(EventHook));
  }

  client.createEventHook = function(payload) {
    let url = `${this.baseUrl}/api/v1/webhooks`;
    const resources = [];

    const request = this.http.postJson(url, {
      body: payload
    }, {resources});
    return request
      .then(jsonRes => new EventHook(jsonRes, this));
  }

  client.verifyEventHook = function(hookId) {
    let url = `${this.baseUrl}/api/v1/webhooks/${hookId}/verify`;
    const resources = [];

    const request = this.http.post(url, null, {resources});
    return request
  }

  client.deactivateEventHook = function (hookId) {
    let url = `${this.baseUrl}/api/v1/webhooks/${hookId}`;
    const resources = [ url ];

    const request = this.http.putJson(url, {body: {status: "INACTIVE"}});
    // console.log(request)
    return request
    // .then(jsonRes => new InlineHook(jsonRes, this));
  }

  client.deleteEventHook = function (hookId) {
    let url = `${this.baseUrl}/api/v1/webhooks/${hookId}`;
    const resources = [ url ];

    const request = this.http.delete(url, null, {resources});
    return request;
  }
}
