# Setting up the Oktane19 Ticket Co. sample app

- Open https://glitch.com/edit/#!/ticketco and click the "Remix to Edit" button on the right
- Click the "Show [Live]" link in your newly remixed app
- This will open a new tab with a URL that looks something like https://example.glitch.me - this is your "TICKETCO_URL"


``` shell
npm install
export TICKETCO_URL={the URL from Glitch above}
export OKTA_ORG_URL={your Okta Org URL}
export OKTA_API_TOKEN={your Okta API Token}
npm run setup
```

- Copy and paste the output from that command.
- Open the `.env` file in your Glitch app and paste in the output from the command into the approprate place
