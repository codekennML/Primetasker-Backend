const axios = require("axios");

const getUserLocationIP = async (clientIP, ipsToIgnore) => {
  if (clientIP && !(clientIP in Object.values(ipsToIgnore))) {
    const locationFromIPUrl = `https://api.findip.net/${clientIP}/?token=${process.env.FIND_IP_NET_KEY}`;

    const userApproxLocation = await axios.get(locationFromIPUrl);

    let userLocaleData = {};

    if (userApproxLocation) {
      userLocaleData = {
        coordinates: userApproxLocation?.location,
        area: userApproxLocation?.city?.names,
      };
    }

    return userLocaleData;
    // console.log(userApproxLocation.data.city.names);
  } else {
    return {};
  }
};

module.exports = { getUserLocationIP };
