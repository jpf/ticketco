const okta = require('@okta/okta-sdk-nodejs');
const Collection = require('@okta/okta-sdk-nodejs/src/collection');
const ModelFactory = require('@okta/okta-sdk-nodejs/src/model-factory');
const Resource = require('@okta/okta-sdk-nodejs/src/resource');

const ruleSetPatches = require('./okta-sdk-node-ruleset-patches')
const inlineHookPatches = require('./okta-sdk-node-inlinehook-patches')
const eventHookPatches = require('./okta-sdk-node-eventhook-patches')

const program = require('commander');
program
  .version('0.9.0')
  .option('-a, --apply', 'Apply changes')
  .option('-w, --wipe', 'Wipe changes')
  .option('-c, --clear-users', "Remove all users that don't end in '@okta.com'")
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);

let oktaOrgUrl = process.env.OKTA_ORG_URL
let oktaApiToken = process.env.OKTA_API_TOKEN

if(!oktaOrgUrl || !oktaApiToken) {
  program.outputHelp()
  console.log('')
  console.log('You MUST set the OKTA_ORG_URL and OKTA_API_TOKEN environment variables')
  console.log('Try the following commands: ')
  console.log('')
  console.log('$ export OKTA_ORG_URL="https://example.oktapreview.com"')
  console.log('$ export OKTA_API_TOKEN="012AbcDefgHIjKLM3NOPqRSTUvWxyZ4ABCdE5f_6Gh"')
  process.exit()
}

const client = new okta.Client({
  orgUrl: oktaOrgUrl,
  token:  oktaApiToken,
});

// These APIs are in beta, so we're patching the client SDK here until this functionality is officially added to the SDK
ruleSetPatches.apply(client)
inlineHookPatches.apply(client)
eventHookPatches.apply(client)


// This is the JSON that represents the rules that will be applied to the "Browsing" OIDC app
var noFactorRules = [
  {
    "name": "No Factor with Inline Hook: AuthN",
    "type": "Okta:AuthenticationFactors",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:AuthenticationFactors",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
          "factorRequirements": []
        }
      }
    ],
    "resourceIds": []
  },
  {
    "name": "No Factor with Inline Hook: Enrollment",
    "type": "Okta:EnrollmentProfile",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:EnrollmentProfile",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
          "inlineHookRequirements": [{
            "preRegistrationInlineHookId": "{{callout ID you have created}}"
          }]
        }
      }
    ],
    "resourceIds": []
  },
  {
    "name": "No Factor with Inline Hook: Activation",
    "type": "Okta:ActivationFactors",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:ActivationFactors",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
          "factorRequirements": []
        }
      }
    ],
    "resourceIds": []
  }
]

// This is the JSON that represents the rules that will be applied to the "Ready to Purchase" OIDC app
var emailFactorRules = [
  {
    "name": "Email Factor: AuthN",
    "type": "Okta:AuthenticationFactors",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:AuthenticationFactors",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
          "factorRequirements": [
            {
              "factor": {
                "provider": "OKTA",
                "factorType": "email"
              },
              "factorPromptMode": "ALWAYS"
            }
          ]        
        }
      }
    ],
    "resourceIds": []
  },
  {
    "name": "Email Factor: Enrollment",
    "type": "Okta:EnrollmentProfile",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:EnrollmentProfile",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
        }
      }
    ],
    "resourceIds": []
  },
  {
    "name": "Email Factor: Activation",
    "type": "Okta:ActivationFactors",
    "isDefault": false,
    "rules": [
      {
        "type": "Okta:ActivationFactors",
        "rulesetId": "TBD",
        "conditions": [
          {
            "key": "Okta:UserType",
            "op": "EQUALS",
            "value": "Default"
          }
        ],
        "action": "ALLOW",
        "requirement": {
          "factorRequirements": [
            {
              "factor": {
                "provider": "OKTA",
                "factorType": "email"
              },
              "factorEnrollmentType": "REQUIRED"
            }
          ]
        }
      }
    ],
    "resourceIds": []
  },
]

function debug(text) {
  if (program.verbose) {
    console.log(text)
  }
}

// This removes all of the following from the Okta Org:
// - Event Hooks
// - Inline Hooks
// - Applications
// - RuleSets
async function wipe() {
  Promise.all([
    client.listEventHooks()
      .each(hook => {
        return hook.deactivate()
          .then(() => hook.delete())
          .then(() => { debug(`eventHook ${hook.id} deleted`); })
          .catch(rejected => debug(rejected));
      }),
    client.listInlineHooks()
      .each(hook => {
        return hook.deactivate()
          .then(() => hook.delete())
          .then(() => { debug(`inlineHook ${hook.id} deleted`); })
          .catch(rejected => debug(rejected));
      }),
    client.listApplications()
    .each(app => {
      return app.deactivate()
        .then(() => app.delete())
        .then(() => debug(`app ${app.id} deleted`))
        .catch(rejected => debug(rejected));
    }),
    client.listRuleSets()
    .each(ruleSet => {
      return ruleSet.delete()
        .then(() =>  debug(`ruleset ${ruleSet.id} deleted`))
        .catch(rejected => debug(rejected));
    })
  ]).then(() => {
    debug('Done')
    process.exit()
  }).catch(rejected => {
      debug('Error')
      debug(rejected)
    });
}

// TODO: Delete me if this works!
// This is to handle a schema change and will be useless after 2018-03-20
function patchRule(rule) {
  if(rule.requirement.factorRequirements || rule.requirement.inlineHookRequirements) {
    switch(rule.type) {
    case 'Okta:AuthenticationFactors':
      let authnFq = rule.requirement['factorRequirements'];
      delete rule.requirement['factorRequirements'];
      rule.requirement['authnFactorRequirements'] = {
        "factorRequirements": authnFq
      }
      break;
    case 'Okta:ActivationFactors':
      let activationFq = rule.requirement['factorRequirements'];
      delete rule.requirement['factorRequirements'];
      rule.requirement['activationFactorRequirements'] = {
        "factorRequirements": activationFq
      }
      break;
    case 'Okta:EnrollmentProfile':
      let hookReq = rule.requirement['inlineHookRequirements'];
      delete rule.requirement['inlineHookRequirements'];
      rule.requirement['enrollmentRequirements'] = {
        "inlineHookRequirements": hookReq
      }
      break;
    }
  }
  return rule
}

// Creating a RuleSet is a three step process:
// 1. Create a RuleSet
// 2. Add a rule to the RuleSet
// 3. Map the RuleSet to an OIDC app
async function applyRuleSet(ruleSetPayload, app) {
  let rulePayload = ruleSetPayload.rules[0]
  ruleSetPayload.rules = []
  let ruleSet = await client.createRuleSet(ruleSetPayload)
  // await ruleSet.addRule(rulePayload)
  await ruleSet.addRule(rulePayload)
  await ruleSet.addMapping(app)
}

// syntatic sugar
async function applyRegHook(payload) {
  return client.createInlineHook(payload);
}

// This does a lot of the legwork for setting up the demo:
// - Creates 2 OIDC apps
// - Assigns the 2 OIDC apps to the "Everyone" group
// - Creates a Registration Hook for one of the OIDC app
// - Creates the RuleSets for the respective OIDC apps
// - Creates and Event Hook for new user creation
//
// Q: Why didn't you use Terraform for this?
// A: I didn't have the time, sorry.
async function apply() {
  // e.g.: let baseUrl = 'https://app.ticketco.org'
  let baseUrl = process.env.TICKETCO_URL
  if(!baseUrl) {
    console.log('You MUST set the TICKETCO_URL environment variable')
    console.log('Try the following command: ')
    console.log('')
    console.log('$ export TICKETCO_URL="https://example.glitch.me"')
    process.exit()
  }
  debug(`using url: ${baseUrl}`)

  function appTemplate() {
    return {
      "name": "oidc_client",
      "label": "",
      "signOnMode": "OPENID_CONNECT",
      "settings": {
        "oauthClient": {
          "client_uri": "",
          "logo_uri": "https://cdn.glitch.com/d89da6d4-d7a0-4b4a-bb47-ded491dd7cc3%2Fbrowsing.png",
          "redirect_uris": [],
          "response_types": [
            "token",
            "code",
            "id_token"
          ],
          "grant_types": [
            "implicit",
            "authorization_code"
          ],
          "initiate_login_uri": "",
          "application_type": "web",
          "issuer_mode": "ORG_URL"
        }
      }
    }
  }

  const browsingAppUrl = `${baseUrl}/browse`
  let browsingAppPayload = appTemplate();
  browsingAppPayload.label = "Browsing";
  browsingAppPayload.settings.oauthClient.client_uri = browsingAppUrl
  browsingAppPayload.settings.oauthClient.initiate_login_uri = browsingAppUrl
  browsingAppPayload.settings.oauthClient.redirect_uris = [ browsingAppUrl ]

  const purchaseAppUrl = `${baseUrl}/purchase`

  let purchaseAppPayload = appTemplate();
  purchaseAppPayload.label = "Ready to Purchase"
  purchaseAppPayload.settings.oauthClient.client_uri = purchaseAppUrl
  purchaseAppPayload.settings.oauthClient.initiate_login_uri = purchaseAppUrl
  purchaseAppPayload.settings.oauthClient.redirect_uris = [ purchaseAppUrl ]

  let preRegHookPayload = {
    "name": "Experian registration logic",
    "type": "com.okta.user.pre-registration",
    "version": "1.0.0",
    "channel": {
      "type": "HTTP",
      "version": "1.0.0",
      "config": {
        "uri": `${baseUrl}/okta/hooks/registration`,
        "headers": [],
        "method": "POST",
        "authScheme": {
          "type": "HEADER",
          "key":"Authorization",
          "value": "none"
        }
      }
    }
  }
  
  let eventHookPayload = {
    "name": "user.lifecycle.create hook",
    "events" : {
      "type" : "EVENT_TYPE",
      "items" : [
        "user.lifecycle.create"
      ]
    },
    "channel": {
      "type": "HTTP",
      "version": "1.0.0",
      "config": {
        "uri": `${baseUrl}/okta/hooks/add-user`,
        "authScheme": {
          "type": "HEADER",
          "key": "Authorization",
          "value": "none"
        }
      }
    }
  }

  let preRegHook = await applyRegHook(preRegHookPayload)
  debug(`got: ${preRegHook.id}`)
  
  noFactorRules.forEach(ruleSet => {
    if(ruleSet.type == 'Okta:EnrollmentProfile') {
      ruleSet.rules[0].requirement.inlineHookRequirements[0].preRegistrationInlineHookId = preRegHook.id
    }
  })
  
  let promises = []

  promises.push(client.createEventHook(eventHookPayload).then(hook => {
    hook.verify()
  }))
  
  let browsingApp = await client.createApplication(browsingAppPayload)
  debug('Created browsing app: ', browsingApp.id);

  noFactorRules.map(ruleSet => {
    promises.push(applyRuleSet(ruleSet, browsingApp))
  });

  let purchaseApp = await client.createApplication(purchaseAppPayload)
  debug('Created purchase app: ', purchaseApp.id);

  emailFactorRules.map(ruleSet => {
    promises.push(applyRuleSet(ruleSet, purchaseApp))
  });

  promises.push(
    client.listGroups({q: 'Everyone'}).each(group => {
      // client.createApplicationGroupAssignment(createdApplication.id, createdGroup.id);
      client.createApplicationGroupAssignment(browsingApp.id, group.id)
      client.createApplicationGroupAssignment(purchaseApp.id, group.id)
    })
  )

  return Promise.all(
    promises
  )
    .then(() => {
      console.log('# Paste the text below into Glitch:')
      console.log('')
      console.log('# e.g.: https://example.oktapreview.com')
      console.log(`OKTA_BASE_URL=${oktaOrgUrl}`)
      console.log('# App named "Browsing"')
      console.log(`BROWSING_APP_ID=${browsingApp.id}`)
      console.log('# App named "Ready to purchase"')
      console.log(`PURCHASE_APP_ID=${purchaseApp.id}`)
    })
    .catch(rejected => debug(rejected));
}

if(program.apply) {
  Promise.resolve(apply())
    .then(() => { process.exit(); })
    .catch(rejected => {
      debug("Error")
      debug(rejected)
    }) 
} else if(program.wipe) {
  wipe()
} else if(program.clearUsers) {
  const orgUsersCollection = client.listUsers({filter: 'lastUpdated gt "2017-06-05T23:00:00.000Z"'});

  orgUsersCollection.each(user => {
    const login = user.profile.login;
    if(!login.includes('@okta.com') && !login.includes('@example.com')) {
      debug(`Processing ${login}`);
      if(user.status == 'DEPROVISIONED') {
        return user.delete()
          .then(() => debug(`${login} has been deleted`))
      } else {
        return user.deactivate()
          .then(() => debug(`${login} has been deactivated`))
          .then(() => user.delete())
          .then(() => debug(`${login} has been deleted`))
          .catch((rejected) => console.log(rejected));
      }
    } else {
      debug(`Keeping ${login}`);
    }
  })
    .then(() => {
      debug('All users have been listed')
    })
    .then(function() {
      process.exit()
    })
    .catch((err) => console.log(err))
} else {
  program.help()
}
