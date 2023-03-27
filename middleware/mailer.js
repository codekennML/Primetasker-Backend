const client = require("postmark");
const { logEvents } = require("./logger");

var mailer = new client.ServerClient(process.env.MAIL_USER);

const sendMail = async (details) => {
  try {
    // console.log(...details.params);
    await mailer.sendEmailWithTemplate({
      TemplateId: details.templateId,
      From: details.sent_From,
      To: details.sent_To,
      TemplateModel: {
        ...details.params,
      },
    });
  } catch (err) {
    logEvents(
      `Failed to send mail : ${err}/t${details.sent_To}`,
      "mailErrLog.log"
    );
  }
};

module.exports = { sendMail };
