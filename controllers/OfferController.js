const { respond } = require("../helpers/response");
const Offer = require("../model/Offers");

const createOffer = async (req, res) => {
  const { offerId, offerDetails } = req.body;

  if (!offerId) {
    respond(res, 400, "Bad Request. Missing offer Id", null);
  }

  const offer = await Offer.create(offerDetails);
  if (!offer) {
    respond(res, 400, "Failed to create offer");
  }

  let offerDetail = await Detail.findOne({ offerId: offerId });
  if (!offerDetail) {
    respond(res, 404, "No offer found for this Offer", null);
  }

  offerDetail.offers.push(offer._id);

  offerDetails = await offerDetail.save();

  respond(res, 201, "offer created success", offer);
};

const editOffer = async (req, res) => {
  const { id: offerId } = req.body;
  if (!offerId) {
    respond(res, 400, "Bad Request , Missing offer Id");
  }
};

const getAllOffers = async (req, res) => {
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Filtering Results - >>>>>>>>>>>>>>>>>>>//

  //Create a query array that we will push further conditions to, based on the received url params
  let query = [];

  const reqQuery = { ...req.query }; //Spread out the request params array

  console.log(req.query.page);
  const excludeParams = ["sort", "page", "search"]; //fields to remove from the list to be filtered

  excludeParams.forEach((params) => delete reqQuery[params]); //exclude unwanted fields

  let filterOption;

  const filter = reqQuery.filter;

  switch (true) {
    default:
      filterOption = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> - Searching Results - >>>>>>>>>>>>>>>>>>>>>//

  let offerQuery;

  const searchTerm = req.query?.search;

  if (searchTerm !== undefined && searchTerm !== "") {
    const isObjectId = searchTerm.match(/^[0-9a-fA-F]{24}$/); //Check if the query is a offer id
    if (isObjectId) {
      offerQuery = { _id: mongoose.Types.ObjectId(searchTerm) }; //If its object Id, search in id field
    } else if (!isObjectId) {
      const queryRegex = new RegExp(searchTerm, "i");
      (searchString = {
        $or: [
          { "creator.firstname": queryRegex },
          { "creator.lastname": queryRegex },
          { budget: queryRegex },
          { title: queryRegex },
        ],
      }),
        (offerQuery = searchString);
    }
  } else {
    offerQuery = {};
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> --  Sorting Results - >>>>>>>>>>>>>>>>>//

  let fieldToSort;

  const offerSortField = req.query?.sort;
  if (offerSortField === undefined || offerSortField === "") {
    fieldToSort = { createdAt: -1 };
  } else {
    const string = offerSortField.toLowerCase().replaceAll(" ", "");
    fieldToSort = { [string]: 1 };
  }

  // >>>>>>>>>>>>>>>>>>>>>>>>> - Paginating Results-  >>>>>>>>>>>>//

  const page = parseInt(req.query?.page) || 1; //Page being requested
  const pageSize = parseInt(req.query?.limit) || 10; //Number of items per page
  const docsToSkip = (page - 1) * pageSize; //Number of items to skip on page
  const totalResultCount = await Offer.countDocuments(query);
  const pages = Math.ceil(totalResultCount / pageSize);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Populate Query Array >>>>>>>>>>>>>>>>>>>>>>>.
  req?.roles?.includes("admin")
    ? (offerQuery = { ...offerQuery, userDeleted: { $in: [true, false] } })
    : (offerQuery = { ...offerQuery, userDeleted: false || undefined });

  //Match stage
  query.push({
    $match: offerQuery,
  });
  //Lookup Stage
  query.push(
    {
      //Lookup query to find the creator of each offer based on the creator ref to the User table
      $lookup: {
        from: "users",
        localField: "creator",
        foreignField: "_id",
        let: { searchId: { $toObjectId: "$creator" } }, //creator id was stored as string, need to convert to object id

        pipeline: [
          { $match: { $expr: [{ _id: "$$searchId" }] } },

          {
            $project: {
              _id: 1,
              firstname: 1,
              lastname: 1,
              email: 1,
              gender: 1,
              homeaddress: 1,
              phone: 1,
              Avatar: 1,
            },
          },
        ],

        as: "creator_details",
      },
    },
    { $unwind: "$creator_details" }
  );
  //Sort Stage
  query.push({
    $sort: fieldToSort,
  });

  //Pagination Stage
  query.push({
    $skip: docsToSkip,
  });
  query.push({
    $limit: pageSize,
  });

  console.log(query);

  // >>>>>>>>>>>>>>>>>> Returning Response  >>>>>>>>>>>>>>>>>>>>//

  const offers = await Offer.aggregate(query);

  res.status(200).json({
    message: "Offers fetched successfully",
    data: {
      offers: offers,
      meta: {
        page: page,
        pages: pages,
        totalDocs: totalResultCount,
      },
    },
  });
};

//   const getUserOffer = async (req, res) => {
//     const userId = req.body;

//     if (!userId) {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     const offers = await Offer.findById({ creator: userId });

//     if (!offers) {
//       respond(res, 404, "No offers found", null);
//     }
//     respond(res, 200, "offers fetched success", offers);
//   };

const getSpecificOffer = async (req, res) => {
  const { id: offerId } = req.params;

  if (!offerId) {
    respond(res, 400, "Bad Request, Please try again");
  }
  console.log(offerId);
  //Set offers to Details :: TODO

  var offer = await Offer.findById(offerId)
    .populate
    // { path: "offer" }
    // { path: "offers" },
    // { path: "comments" }
    ();

  if (!offer) {
    return res.status(404).json({ message: "Error: Offer does not exist" });
  }
  return res
    .status(200)
    .json({ data: offer, message: "Offers fetched successfully" });
};

const updateOffer = async (req, res) => {
  const { offerId, fields } = req.body;

  if (!offerId) {
    respond(res, 400, null, "Bad Request");
  }

  var offer = await Offer.findById(offerId);
  if (!offer) respond(req, res, 404, null, "Offer not Found");

  Object.keys(fields).map((key) => {
    if (key in offer) {
      offer[key] = fields[key];
    }
  });

  const updatedOffer = await offer.save();

  if (!updatedOffer) {
    respond(res, 400, "Failed to update offer", null);
  }

  respond(res, 200, "offer update success", updatedOffer);
};

const deleteOffer = async (req, res) => {
  const { offerId } = req.body;

  if (!offerId) {
    respond(res, 400, "Bad Request, missing offer id", null);
  }

  const offerToDelete = await Offer.findById(offerId);

  if (!offerToDelete) {
    respond(res, 404, "Error : Offer Not Found", null);
  }

  offerToDelete.userDeleted = true;
  offerToDelete = offerToDelete.save();

  if (!offerToDelete) {
    respond(res, 400, "Failed to delete offer. Please try again ", null);
  }

  respond(res, 200, "Your offer has been deleted", null);
};

module.exports = {
  createOffer,
  getAllOffers,
  getSpecificOffer,
  updateOffer,
  deleteOffer,
};
