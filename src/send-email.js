const nodemailer = require('nodemailer');

// Create a transporter using user/password authentication
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Sends an email asynchronously using Nodemailer.
 *
 * @async
 * @function sendEmail
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 * @returns {Promise<void>} Resolves when the email is sent, rejects with an error if sending fails.
 */
async function sendEmail(subject, text) {
  // Define the email options
  const mailOptions = {
    from: process.env.EMAIL_USER,          // Sender's address
    to: process.env.EMAIL_RECEPIENT,     // List of recipients
    subject: subject,                      // Subject line passed to the function
    text: text,                            // Plain text body passed to the function
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error: ${error}`);

    throw new Error(error);
  }
}

module.exports = { sendEmail };