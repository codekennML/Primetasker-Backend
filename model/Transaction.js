const mongoose =  require('mongoose')
const User = require('./User')
const { Schema } = mongoose

const transactionSchema =  new Schema ({
    trans_id : {
        type: String,
        required : true,
    },

    creator : {
        type: mongoose.SchemaTypes.ObjectId,
        ref : User,
        required : true
    },

    receiver : {
        type: mongoose.SchemaTypes.ObjectId,
        ref : User,
        required : true
    },

    method : {
        type : String ,
        required : true,
        enum : ['debitCard' , 'cashOnDelivery','bankTransfer', 'ussd'],  
    },

    gateway : {
        type : String,
        required : function (){return this.method === 'debitCard'}

    },
    purpose : {
        type : String,
        required : true

    }
})

module.exports = mongoose.model('Transaction', transactionSchema)