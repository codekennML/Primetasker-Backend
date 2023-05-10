const { respond } = require("../helpers/response");
const Offer = require("../model/Offers");
const Task = require("../model/Task");

const createOffer = async (req, res) => {
  const { offerDetails } = req.body;
  console.log(offerDetails.offerMessage);

  console.log(offerDetails);

  if (!offerDetails.taskId || !offerDetails.createdBy) {
    respond(res, 400, "Bad Request. Missing task Id", null, 400);
  }

  let offerTask = await Task.findOne({ _id: offerDetails.taskId });

  if (!offerTask) {
    respond(res, 404, "No task found for this offer", null, 404);
  }

  const offer = await Offer.create(offerDetails);

  if (!offer) {
    respond(res, 409, "Failed to create offer", null, 409);
  }

  offerTask.offerCount = offerTask.offerCount + 1;
  offerTask.offers.push(offer._id);

  if (offerTask.offers.length > 15) {
    offerTask.hasMoreOffers = true;
  }

  offerTask.offers
    .sort((a, b) => b.getTimestamp() - a.getTimestamp())
    .slice(0, 15);

  const modifiedTask = await offerTask.save();
  // console.log(modifiedTask);

  if (!offer) {
    respond(res, 409, "Task offer update failed", null, 409);
  }

  // emitter.emit("offerMade", {
  //   taskCreator: offerTask.userId,
  //   taskId: offerTask._id,
  //   createdBy: offer.createdBy,
  // });

  // sendOfferMadeMailQueue.add({
  //   taskCreator: offerTask.userId,
  //   taskId: offerTask._id,
  // });

  respond(res, 201, "offer created success", offer, 201);
};

const editOffer = async (req, res) => {
  const { id: offerId, editDetails } = req.body;
  if (!offerId) {
    respond(res, 400, "Bad Request , Missing offer Id");
  }
  let offerToEdit = await Offer.findById(offerId);

  if (!offerToEdit) {
    respond(res, 404, "Error : Offer does not exist", null, 404);
  }

  Object.keys(editDetails).map((key) => {
    //update the key in the doc or create the key if it doesnt exist within the documebt
    offerToEdit[key] = editDetails[key];
  });

  const editedOffer = await Offer.save(offerToEdit);

  if (!editedOffer) {
    respond(res, 409, "Error: Failed to update Offer", null, 409);
  }

  respond(res, 200, "Offer Update successfull", editedOffer, 200);
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
      offerQuery = { _id: mongoose.Types.ObjectId(searchTerm) };
    } else {
      offerQuery = {};
    }
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
        localField: "createdBy",
        foreignField: "_id",
        let: { searchId: { $toObjectId: "$createdBy" } }, //creator id was stored as string, need to convert to object id

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

const getTaskOffers = async (req, res) => {
  const { taskId, page } = req.query;

  console.log(taskId, page);

  console.log(req.query);

  if (!taskId) {
    respond(res, 400, "Bad Request, missing task id", null, 400);
  }

  //Fetching second page as we have already sent first page to the frontend with the tasks
  const currPage = parseInt(page) || 1;
  const pageSize = 10;
  const docsToskip = (currPage - 1) * pageSize;

  const offers = await Offer.find({ taskId })
    .populate({ path: "createdBy", select: "Avatar firstname lastname " })
    .sort({ createdAt: -1 })
    .skip(docsToskip)
    .limit(10);

  if (!offers) {
    respond(res, 404, "Error : No  offers for this task", null, 404);
  }

  const pages = Math.ceil(offers.length / pageSize);

  const result = {
    offers: offers,
    meta: {
      page: page,
      pages: pages,
    },
  };

  respond(res, 200, "comment fetched success", result, 200);
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
  getTaskOffers,
  getAllOffers,
  getSpecificOffer,
  updateOffer,
  deleteOffer,
};
