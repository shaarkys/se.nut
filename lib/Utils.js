"use strict";

/**
 * Determine if the given value is "blank".
 *
 * @param  value
 * @return boolean
 */
const blank = function blank(value) {
  if (typeof value === "undefined") {
    return true;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  if (typeof value === "function") {
    return false;
  }

  return false;
};

/**
 * Determine if the given value is "filled".
 *
 * @param  value
 * @return boolean
 */
const filled = function filled(value) {
  return !blank(value);
};

module.exports.blank = blank;
module.exports.filled = filled;

module.exports.parseUPSStatus = (body) => {
  const STATE_TYPES = {
    OL: "Online",
    OB: "On Battery",
    LB: "Low Battery",
    HB: "High Battery",
    RB: "Battery Needs Replaced",
    CHRG: "Battery Charging",
    DISCHRG: "Battery Discharging",
    BYPASS: "Bypass Active",
    CAL: "Runtime Calibration",
    OFF: "Offline",
    OVER: "Overloaded",
    TRIM: "Trimming Voltage",
    BOOST: "Boosting Voltage",
    FSD: "Forced Shutdown",
    ALARM: "Alarm",
  };

  const result = {};
  result.capabilities = [];
  const notCapabilities = new Set(["name", "id"]);

  result.values = {
    name: filled(body["ups.model"]) ? body["ups.model"] : null,
    measure_battery: filled(body["battery.charge"]) ? parseInt(body["battery.charge"], 10) : null,
    measure_battery_runtime: filled(body["battery.runtime"]) ? parseInt(body["battery.runtime"], 10) : null,
    measure_temperature: filled(body["battery.temperature"]) ? parseFloat(body["battery.temperature"]) : null,
    id: filled(body["ups.serial"]) ? body["ups.serial"] : null,
    measure_voltage: {
      input: filled(body["input.voltage"]) ? parseInt(body["input.voltage"], 10) : null,
      output: filled(body["output.voltage"]) ? parseInt(body["output.voltage"], 10) : null,
    },
    status: filled(body["ups.status"]) ? body["ups.status"] : null,
    alarm_status: false,
  };

  // Add ups.load and battery.voltage if available
  if (filled(body["ups.load"])) {
    result.values.measure_load = parseInt(body["ups.load"], 10);
  }
  if (filled(body["battery.voltage"])) {
    result.values.measure_battery_voltage = parseFloat(body["battery.voltage"]);
  }

  if (filled(result.values.status)) {
    let readableStatus = "";
    result.values.alarm_status = !result.values.status.startsWith("OL");

    // eslint-disable-next-line no-return-assign
    result.values.status.split(" ").forEach((word) => (readableStatus += `${STATE_TYPES[word]}, `));
    // Remove trailing comma from status readable
    readableStatus = readableStatus.replace(/,\s*$/, "");

    result.values.status = readableStatus;
  }

  /* Set the capabilities list */
  for (const [key, value] of Object.entries(result.values)) {
    if (filled(value) && !notCapabilities.has(key)) {
      if (value instanceof Object) {
        for (const [subKey, subValue] of Object.entries(value)) {
          if (filled(subValue)) {
            result.capabilities.push(`${[key]}.${[subKey]}`);
          }
        }
      } else {
        result.capabilities.push(key);
      }
    }
  }

  return result;
};
