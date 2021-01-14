const mongoose = require("mongoose");

mongoose.connect('mongodb+srv://bansalraghav19:RAGhav123%40%23@cluster0.jivzn.mongodb.net/chatApp?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
