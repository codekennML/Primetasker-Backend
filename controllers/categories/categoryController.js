const { respond } = require("../../helpers/response");
const Category = require("../../model/Category");

const createCategory = async (req, res) => {
  const { categoryInfo } = req.body;
  const { image, tagline, title } = categoryInfo;

  //   console.log(taskId, commentDetails);
  //Comment details has same structure as the comment model

  if (!image || !title || !tagline) {
    respond(res, 400, "Bad Request. Missing category Details", null);
  }

  let category = await Category.create(categoryInfo);
  // console.log(comment);
  if (!category) {
    respond(res, 409, "Failed to create category", null, 409);
  }

  respond(res, 201, "comment created success", category, 201);
};

const getCategories = async (req, res) => {
  let categories;

  const categoryId = req.params?.categoryId;

  if (!categoryId) {
    categories = await Category.find();
  } else {
    const data = await Category.find({ categoryId });
    categories = [data];
  }
  console.log(categories);

  if (!categories) {
    respond(res, 200, "Success : No categories found", null, 200);
  }

  respond(res, 200, "Success : Category fetched success", categories, 200);
};

module.exports = { createCategory, getCategories };
