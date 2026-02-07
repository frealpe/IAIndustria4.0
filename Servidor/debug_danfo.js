const dfd = require("danfojs-node");
console.log("Keys in dfd:", Object.keys(dfd));
if (dfd.tf) {
    console.log("dfd.tf IS present");
} else {
    console.log("dfd.tf is UNDEFINED");
}
if (dfd.tensorflow) {
    console.log("dfd.tensorflow IS present");
}
