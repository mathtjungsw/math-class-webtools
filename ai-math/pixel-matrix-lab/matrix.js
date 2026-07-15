(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PixelMatrix = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    min = min === undefined ? 0 : min;
    max = max === undefined ? 255 : max;
    return Math.min(max, Math.max(min, value));
  }

  function rgbToLuminance(r, g, b) {
    return Math.round(clamp(Number(r)) * 0.2126 + clamp(Number(g)) * 0.7152 + clamp(Number(b)) * 0.0722);
  }

  function imageDataToMatrix(imageData) {
    var matrix = [];
    for (var y = 0; y < imageData.height; y += 1) {
      var row = [];
      for (var x = 0; x < imageData.width; x += 1) {
        var index = (y * imageData.width + x) * 4;
        row.push(rgbToLuminance(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]));
      }
      matrix.push(row);
    }
    return matrix;
  }

  function binary(matrix, threshold) {
    threshold = Number(threshold);
    return matrix.map(function (row) {
      return row.map(function (value) { return value >= threshold ? 1 : 0; });
    });
  }

  function matrixSize(matrix) {
    return { height: matrix.length, width: matrix.length ? matrix[0].length : 0 };
  }

  function resampleNearest(matrix, targetWidth, targetHeight) {
    var source = matrixSize(matrix);
    if (!source.width || !source.height || targetWidth < 1 || targetHeight < 1) return [];
    var result = [];
    for (var y = 0; y < targetHeight; y += 1) {
      var sourceY = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / targetHeight));
      var row = [];
      for (var x = 0; x < targetWidth; x += 1) {
        var sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / targetWidth));
        row.push(matrix[sourceY][sourceX]);
      }
      result.push(row);
    }
    return result;
  }

  function resampleAverage(matrix, targetWidth, targetHeight) {
    var source = matrixSize(matrix);
    if (!source.width || !source.height || targetWidth < 1 || targetHeight < 1) return [];
    var result = [];
    for (var ty = 0; ty < targetHeight; ty += 1) {
      var yStart = ty * source.height / targetHeight;
      var yEnd = (ty + 1) * source.height / targetHeight;
      var row = [];
      for (var tx = 0; tx < targetWidth; tx += 1) {
        var xStart = tx * source.width / targetWidth;
        var xEnd = (tx + 1) * source.width / targetWidth;
        var weightedSum = 0;
        var totalWeight = 0;
        for (var sy = Math.floor(yStart); sy < Math.ceil(yEnd); sy += 1) {
          var overlapY = Math.max(0, Math.min(yEnd, sy + 1) - Math.max(yStart, sy));
          for (var sx = Math.floor(xStart); sx < Math.ceil(xEnd); sx += 1) {
            var overlapX = Math.max(0, Math.min(xEnd, sx + 1) - Math.max(xStart, sx));
            var weight = overlapX * overlapY;
            if (matrix[sy] && matrix[sy][sx] !== undefined) {
              weightedSum += matrix[sy][sx] * weight;
              totalWeight += weight;
            }
          }
        }
        row.push(Math.round(weightedSum / totalWeight));
      }
      result.push(row);
    }
    return result;
  }

  function reflectIndex(index, length) {
    if (length <= 1) return 0;
    while (index < 0 || index >= length) {
      if (index < 0) index = -index - 1;
      if (index >= length) index = length * 2 - index - 1;
    }
    return index;
  }

  function sample(matrix, y, x, padding) {
    var size = matrixSize(matrix);
    if (y >= 0 && y < size.height && x >= 0 && x < size.width) return matrix[y][x];
    if (padding === "extend") {
      return matrix[clamp(y, 0, size.height - 1)][clamp(x, 0, size.width - 1)];
    }
    if (padding === "reflect") {
      return matrix[reflectIndex(y, size.height)][reflectIndex(x, size.width)];
    }
    return 0;
  }

  function kernelSum(kernel) {
    return kernel.reduce(function (sum, row) {
      return sum + row.reduce(function (rowSum, value) { return rowSum + Number(value || 0); }, 0);
    }, 0);
  }

  function convolutionAt(matrix, kernel, y, x, options) {
    options = options || {};
    var padding = options.padding || "zero";
    var products = [];
    var raw = 0;
    for (var ky = 0; ky < 3; ky += 1) {
      for (var kx = 0; kx < 3; kx += 1) {
        var input = sample(matrix, y + ky - 1, x + kx - 1, padding);
        var weight = Number(kernel[ky][kx]) || 0;
        var product = input * weight;
        raw += product;
        products.push({ input: input, weight: weight, product: product, sourceY: y + ky - 1, sourceX: x + kx - 1 });
      }
    }
    var divisor = 1;
    if (options.normalize) {
      var sum = kernelSum(kernel);
      divisor = sum === 0 ? 1 : sum;
    } else if (Number(options.divisor)) {
      divisor = Number(options.divisor);
    }
    var normalized = raw / divisor;
    var biased = normalized + (Number(options.bias) || 0);
    var output = Math.round(clamp(biased));
    return { products: products, raw: raw, divisor: divisor, normalized: normalized, biased: biased, output: output };
  }

  function convolve(matrix, kernel, options) {
    var size = matrixSize(matrix);
    var output = [];
    for (var y = 0; y < size.height; y += 1) {
      var row = [];
      for (var x = 0; x < size.width; x += 1) row.push(convolutionAt(matrix, kernel, y, x, options).output);
      output.push(row);
    }
    return output;
  }

  function meanSquaredError(a, b) {
    var size = matrixSize(a);
    if (!size.width || size.width !== matrixSize(b).width || size.height !== matrixSize(b).height) return NaN;
    var sum = 0;
    var count = size.width * size.height;
    for (var y = 0; y < size.height; y += 1) {
      for (var x = 0; x < size.width; x += 1) sum += Math.pow(a[y][x] - b[y][x], 2);
    }
    return sum / count;
  }

  return {
    clamp: clamp,
    rgbToLuminance: rgbToLuminance,
    imageDataToMatrix: imageDataToMatrix,
    binary: binary,
    resampleNearest: resampleNearest,
    resampleAverage: resampleAverage,
    reflectIndex: reflectIndex,
    sample: sample,
    kernelSum: kernelSum,
    convolutionAt: convolutionAt,
    convolve: convolve,
    meanSquaredError: meanSquaredError
  };
});
