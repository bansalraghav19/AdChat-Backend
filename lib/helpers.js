const generateOTP = () => {
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

const hashString = (s) => {
  return s.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
};

const messgaeTemplate = (email, otp) => {
  return {
    to: email,
    from: "raghavdidthat3@gmail.com",
    subject: "Verify Your AdChat Account",
    text: `Your Otp for verifying AdChat Account is ${otp}`,
  };
};

module.exports = {
  generateOTP,
  hashString,
  messgaeTemplate
};
