const truncateShard = (osId) => {
    return osId?.substring(2);
}
const checkIfArray = (object) => {
    if (object) {
        object = Array.isArray(object) ? object[0] : object;
    } else {
        throw new CustomError(`${object} not available`, 400).error();
    }
    return object;
}
module.exports = {
    truncateShard,
    checkIfArray
}