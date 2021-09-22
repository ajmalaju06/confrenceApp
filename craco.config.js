// craco.config.js
const CommunicationIdentityClient =
  require("@azure/communication-administration").CommunicationIdentityClient;
const HtmlWebPackPlugin = require("html-webpack-plugin");
const config = require("./config.json");

if (
  !config ||
  !config.connectionString ||
  config.connectionString.indexOf("endpoint=") === -1
) {
  throw new Error("Update `config.json` with connection string");
}

const communicationIdentityClient = new CommunicationIdentityClient(
  config.connectionString
);

module.exports = {
  style: {
    postcss: {
      plugins: [require("tailwindcss"), require("autoprefixer")],
    },
  },
  devServer: {
    open: true,
    before: function (app) {
      app.post("/tokens/provisionUser", async (req, res) => {
        try {
          let communicationUserId =
            await communicationIdentityClient.createUser();
          const tokenResponse = await communicationIdentityClient.issueToken(
            communicationUserId,
            ["voip"]
          );
          res.json(tokenResponse);
        } catch (error) {
          console.error(error);
        }
      });
    },
  },
};
