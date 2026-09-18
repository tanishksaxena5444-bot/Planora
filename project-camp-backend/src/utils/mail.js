import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Planora",
      link: process.env.FRONTEND_URL || "http://localhost:5173",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "hello@demomailtrap.co",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Email service failed siliently. Make sure that you have provided your MAILTRAP credentials in the .env file",
    );
    console.error("Error: ", error);
  }
};

const emailVerificationMailgenContent = (username, verficationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we'are excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verficationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};


const projectInvitationMailgenContent = (
  username,
  projectName,
  projectUrl,
  inviterName,
  existingUser,
) => {
  return {
    body: {
      name: username,
      intro: existingUser
        ? `${inviterName} invited you to collaborate on the Planora project "${projectName}".`
        : `${inviterName} invited you to collaborate on the Planora project "${projectName}". Create a Planora account using this email address to get started.`,
      action: {
        instructions: existingUser
          ? "Open the project from the button below."
          : "Create or sign in to your Planora account, then ask the project admin to resend the invitation.",
        button: {
          color: "#0bbdb3",
          text: "Open Planora project",
          link: projectUrl,
        },
      },
      outro: "Planora — Plan smarter. Work better. Deliver on time.",
    },
  };
};

const taskDueReminderMailgenContent = (username, task, projectName) => {
  return {
    body: {
      name: username,
      intro: `Your task "${task.title}" in project "${projectName}" is due soon.`,
      table: {
        data: [
          {
            Task: task.title,
            "Due Date": new Date(task.dueDate).toDateString(),
            Priority: task.priority,
          },
        ],
      },
      outro: "Log in to Project Camp to update the task status.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  taskDueReminderMailgenContent,
  projectInvitationMailgenContent,
  sendEmail,
};
