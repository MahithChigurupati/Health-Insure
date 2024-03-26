// Import required modules
const {
  addSetValue,
  getKeyType,
  hSet,
  deleteKeys,
  getAllValuesByKey,
  sMembers,
  getKeys,
  setETag,
} = require("./redis.service");
const hash = require("object-hash");

// Get saved plan data based on the key
const getSavedPlan = async (key) => {
  const output = await getOrDeletePlanData(key, {}, false);
  return output;
};

// Create and save a new plan
const createSavePlan = async (key, plan) => {
  // Convert JSON plan to Redis-compatible format
  await convertJSONToMap(plan);
  // Save the plan data
  return getOrDeletePlanData(key, {}, false);
};

// Convert JSON object to a Redis-compatible map
const convertJSONToMap = async (json) => {
  const valueMap = {};
  const map = {};

  // Iterate through each key-value pair in the JSON object
  for (let [key, value] of Object.entries(json)) {
    // Construct Redis key based on objectType and objectId
    const redisKey = `${json["objectType"]}_${json["objectId"]}`;
    if (Array.isArray(value)) {
      // If the value is an array, process it accordingly
      value = await convertToList(value);
      await processArrayValue(redisKey, key, value);
    } else if (typeof value === "object") {
      // If the value is an object, recursively convert it to a Redis-compatible map
      value = await convertJSONToMap(value);
      await processObjectValue(redisKey, key, value);
    } else {
      // If the value is a primitive type, store it directly in Redis
      await hSet(redisKey, key, value.toString());
      valueMap[key] = value;
      map[redisKey] = valueMap;
    }
  }
  return map;
};

// Convert an array to a Redis-compatible list
const convertToList = async (array) => {
  let list = [];
  for (let i = 0; i < array.length; i++) {
    let value = array[i];
    if (Array.isArray(value)) {
      // Recursively convert nested arrays
      value = await convertToList(value);
    } else if (typeof value === "object") {
      // Convert nested objects to Redis-compatible maps
      value = await convertJSONToMap(value);
    }
    list.push(value);
  }
  return list;
};

// Process array values and store them in Redis
const processArrayValue = async (redisKey, key, value) => {
  for (let [_, valueArray] of Object.entries(value)) {
    for (let [keyInnerArray, _] of Object.entries(valueArray)) {
      await addSetValue(`${redisKey}_${key}`, keyInnerArray);
    }
  }
};

// Process object values and store them in Redis
const processObjectValue = async (redisKey, key, value) => {
  const calculatedValue = Object.keys(value)[0];
  await addSetValue(`${redisKey}_${key}`, calculatedValue);
};

// Get or delete plan data from Redis based on the key
const getOrDeletePlanData = async (redisKey, outputMap, isDelete) => {
  const keys = await getKeys(`${redisKey}*`);
  for (let l = 0; l < keys.length; l++) {
    const key = keys[l];
    const keyType = await getKeyType(key);

    if (key === redisKey) {
      if (isDelete) {
        deleteKeys([key]);
      } else {
        // Retrieve and process plan data from Redis
        const val = await getAllValuesByKey(key);
        for (let [keyName, _] of Object.entries(val)) {
          if (keyName.toLowerCase() !== "etag") {
            outputMap[keyName] = !isNaN(val[keyName])
              ? Number(val[keyName])
              : val[keyName];
          }
        }
      }
    } else {
      // Process related keys in Redis
      const newStr = key.substring(`${redisKey}_`.length);
      if (keyType === "set") {
        await processSetKey(redisKey, key, newStr, isDelete, outputMap);
      } else {
        console.error(`Unexpected key type ${keyType} for key ${key}`);
      }
    }
  }

  return outputMap;
};

// Process Redis set keys
const processSetKey = async (redisKey, key, newStr, isDelete, outputMap) => {
  const members = [...(await sMembers(key))];
  if (members.length > 1) {
    const listObj = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (isDelete) {
        await getOrDeletePlanData(member, null, true);
      } else {
        listObj.push(await getOrDeletePlanData(member, {}, false));
      }
    }
    if (isDelete) {
      await deleteKeys([key]);
    } else {
      outputMap[newStr] = listObj;
    }
  } else {
    if (isDelete) {
      await deleteKeys([members[0], key]);
    } else {
      const val = await getAllValuesByKey(members[0]);
      const newMap = {};

      for (let [keyName, _] of Object.entries(val)) {
        newMap[keyName] = !isNaN(val[keyName])
          ? Number(val[keyName])
          : val[keyName];
      }
      outputMap[newStr] = newMap;
    }
  }
};

// Delete saved plan data from Redis
const deleteSavedPlan = async (key) => {
  await getOrDeletePlanData(key, {}, true);
};

// Generate ETag for a key and JSON object
const generateETag = (key, jsonObject) => {
  const eTag = hash(jsonObject);
  setETag(key, eTag);
  return eTag;
};

module.exports = {
  getSavedPlan,
  convertJSONToMap,
  createSavePlan,
  getOrDeletePlanData,
  deleteSavedPlan,
  generateETag,
};
