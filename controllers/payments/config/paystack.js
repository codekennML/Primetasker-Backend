const https = require("https");

class Paystack {
  constructor(initiator, amount, email, reference, payMethod) {
    this.initiator = initiator;
    this.amount = amount;
    this.email = email;
    this.reference = reference;
    this.payMethod = this.payMethod;
  }

  initalizePayment() {
    const params = JSON.stringify({
      email: this.email,
      amount: this.amount * 100,
      metadata: {
        initiator: this.initiator,
        method: this.payMethod,
      },
      // Add metadata here later
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    return new Promise((resolve, reject) => {
      const req = https
        .request(options, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            const result = JSON.parse(data);
            resolve(result);
          });
        })
        .on("error", (error) => {
          reject(error);
        });

      req.write(params);
      req.end();
    });
  }

  verifyPayment() {
    const path = `/transaction/verify/:${this.reference}`;
    console.log(path);
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    };

    https
      .request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log(JSON.parse(data));
        });
      })
      .on("error", (error) => {
        console.error(error);
      });
  }
}

module.exports = { Paystack };
