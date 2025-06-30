$(document).ready(() => {
  let em = $('#embed');
  $.ajax({
    url: em.attr('load'),
    success: (doc) => {
      em.append(doc.documentElement);
    }
  }).done(function() {
    let twinURL = em.attr('twinURL');
    getExclusiveNextIds()
    getStartingPositions();
    setRectHidden();
    getInitialValues(twinURL);
    subscribe(twinURL);
  })
});

let evtSource;
// needed for exclusiveNext functions
let intervalIds = new Map();
let intervalRunning = new Map();
// needed for moveTo functions
let startingPositions = new Map();
// needed for history functions
let historyMap = new Map();
let maxValuesMap = new Map();
let minValuesMap = new Map();

function getExclusiveNextIds() {
  let elements = document.querySelectorAll("[visType*=exclusiveNext] [visValue]");
  elements.forEach((element) => {
    let id = element.getAttribute('id');
    intervalIds.set(id, 1);
    intervalRunning.set(id, false);
  })
}

function getStartingPositions() {
  let elements = document.querySelectorAll("[visType*=move]");
  elements.forEach((element) => {
    let transform = element.getAttribute('transform');
    let id = element.getAttribute('id');
    let x = 0;
    let y = 0;
    if(transform != null) {
      let svgTransform = element.transform.baseVal.getItem(0);
      let matrix = svgTransform.matrix;
      x = matrix.e;
      y = matrix.f;
      startingPositions.set(id, [x, y]);
    } else {
      startingPositions.set(id, [x, y]);
      element.setAttribute('transform', `translate(0, 0)`);
    }
  })
};

function setRectHidden() {
  let groups = document.querySelectorAll("[visType*=history] rect[visValue=main]");
  groups.forEach((element) => {
    element.setAttribute("visibility", "hidden");
  })
};

function getInitialValues(twinURL) {
  $.get(twinURL + "/all")
    .done(function( data ) {
      let dataElements = Object.entries(data.full);
      dataElements.forEach(([fullName, visValue]) => {
        let visConcept = fullName.split("/").pop();
        historyMap.set(visConcept, [])
        historyMap.get(visConcept).push(visValue);
        if(visValue < 0) {
          maxValuesMap.set(visConcept, 0);
          minValuesMap.set(visConcept, visValue);
        } else {
          maxValuesMap.set(visConcept, visValue);
          minValuesMap.set(visConcept, 0);
        }
        executeOperations(visConcept, visValue);
      })
    }); 
};

function subscribe(twinURL) {
  let url = twinURL + "/notifications/subscriptions/?topic=all&events=change";
  // let url = twinURL + "/notifications/subscriptions/?topic=actuators&events=drip&topic=sensors&events=moisture_per&topic=environment&events=relative_humidity";
  // let url = twinURL + "/notifications/subscriptions/?topic=all&events=change";

  $.post(url)
    .done(function( data ) {
      url = twinURL + "/notifications/subscriptions/" + data + "/sse/";
      evtSource = new EventSource(url);
      evtSource.onmessage = (event) => {
        let data = JSON.parse(event.data);
        let visConcept = data.name;
        let visValue = data.content.value;
        historyMap.get(visConcept).push(visValue);
        if(visValue > maxValuesMap.get(visConcept)) {
          maxValuesMap.set(visConcept, visValue);
        }
        if(visValue < minValuesMap.get(visConcept)) {
          minValuesMap.set(visConcept, visValue);
        }
        executeOperations(visConcept, visValue);
      };
    });
};

window.addEventListener('beforeunload', () => {
  if (evtSource) {
    evtSource.close();
  }
});

function executeOperations(visConcept, visValue) {
  exclusive(visConcept, visValue);
  exclusiveBtw(visConcept, visValue);
  exclusiveNext(visConcept, visValue);
  exclusiveNextBtw(visConcept, visValue);
  moveXBy(visConcept, visValue);
  moveYBy(visConcept, visValue);
  moveXYBy(visConcept, visValue);
  moveXTo(visConcept, visValue);
  moveYTo(visConcept, visValue);
  moveXYTo(visConcept, visValue);
  updateText(visConcept, visValue);
  updateFloat(visConcept, visValue);
  historyFixed(visConcept);
  historyDynamic(visConcept);
};

// Operations:
function exclusive(visConcept, visValue) {
  let groups = document.querySelectorAll("[visType=exclusive][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    let elements = group.querySelectorAll("[visValue]");
    elements.forEach((element) => {
      let visValueSVG = element.getAttribute('visValue');
      if(visValueSVG == visValue.toString()) {
        element.classList.add('svgVizOn');
        element.classList.remove('svgVizOff');
      }
      else {
        element.classList.add('svgVizOff');
        element.classList.remove('svgVizOn');
      }
    })
  })
};

function exclusiveBtw(visConcept, visValue) {
  let groups = document.querySelectorAll("[visType=exclusiveBtw][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    let elements = group.querySelectorAll("[visValue]");
    elements.forEach((element) => {
      let visValueSVG = element.getAttribute('visValue').split(",");
      let minValue = parseFloat(visValueSVG[0]);
      let maxValue = parseFloat(visValueSVG[1]);
      if(visValue >= minValue && visValue < maxValue) {
        element.classList.add('svgVizOn');
        element.classList.remove('svgVizOff');
      }
      else {
        element.classList.add('svgVizOff');
        element.classList.remove('svgVizOn');
      }
    })
  })
};

function exclusiveNext(visConcept, visValue) {
  let groups = document.querySelectorAll("[visType=exclusiveNext][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    let elements = group.querySelectorAll("[visValue]");
    elements.forEach((element) => {
      let orderElements = element.querySelectorAll("[visOrder]");
      let visValueSVG = element.getAttribute('visValue');
      let id = element.getAttribute('id');
      let defaultValue = 1000;
      let delay = helperGetVisOptions(element, defaultValue);
      let condition = visValueSVG == visValue.toString();
      helperStartStopInterval(orderElements, id, delay, condition);
    })
  })
}

function exclusiveNextBtw(visConcept, visValue) {
  let groups = document.querySelectorAll("[visType=exclusiveNextBtw][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    let elements = group.querySelectorAll("[visValue]");
    elements.forEach((element) => {
      let orderElements = element.querySelectorAll("[visOrder]");
      let visValueSVG = element.getAttribute('visValue').split(",");
      let minValue = parseFloat(visValueSVG[0]);
      let maxValue = parseFloat(visValueSVG[1]);
      let id = element.getAttribute('id');
      let defaultValue = 1000;
      let delay = helperGetVisOptions(element, defaultValue);
      let condition = visValue >= minValue && visValue < maxValue;
      helperStartStopInterval(orderElements, id, delay, condition);
    })
  })
}

// helper function, not its own operation
function helperStartStopInterval(orderElements, id, delay, condition) {
  if(condition) {
    // start interval, if it's not already started
    if(!intervalRunning.get(id)) {
      // sort elements according to visOrder
      let sorted = Array.from(orderElements);
      sorted.sort((a, b) => {
        return Number(a.getAttribute('visOrder')) - Number(b.getAttribute('visOrder'));
      });
      let currentIndex = 0;
      let intervalId = setInterval(() => {
        sorted.forEach(el => el.classList.add('svgVizOff'));
        sorted[currentIndex].classList.add('svgVizOn');
        sorted[currentIndex].classList.remove('svgVizOff');
        currentIndex = (currentIndex + 1) % sorted.length;
      }, delay);
      intervalIds.set(id, intervalId);
      intervalRunning.set(id, true);
    }
  }
  else {
    clearInterval(intervalIds.get(id));
    intervalRunning.set(id, false);
    orderElements.forEach((child) => {
      child.classList.add('svgVizOff');
      child.classList.remove('svgVizOn');
    })
  }
}

function moveXBy(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveXBy][visConcept=" + visConcept + "]");
  allElements.forEach((element) => {
    let defaultValue = "1";
    let moveFactorX = helperGetVisOptions(element, defaultValue);
    let xDT = 0; // 0 because moveBy is not relative to starting position
    let moveBy = true;
    helperMoveX(element, visValue, moveFactorX, xDT, moveBy);
  })
};

function moveYBy(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveYBy][visConcept=" + visConcept + "]");
  allElements.forEach((element) => {
    let defaultValue = "1";
    let moveFactorY = helperGetVisOptions(element, defaultValue);
    let yDT = 0; // 0 because moveBy is not relative to starting position
    let moveBy = true;
    helperMoveY(element, visValue, moveFactorY, yDT, moveBy);
  })
};

function moveXYBy(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveXYBy]");
  allElements.forEach((element) => {
    let visConceptSVG = element.getAttribute('visConcept').split(/\s*,\s*/);
    let visConceptX = visConceptSVG[0];
    let visConceptY = visConceptSVG[1];
    let defaultValue = "1, 1";

    if(visConceptX == visConcept) {
      let visOptions = helperGetVisOptions(element, defaultValue).split(",");
      let moveFactorX = visOptions[0];
      let xDT = 0; // 0 because moveBy is not relative to starting position
      let moveBy = true;
      helperMoveX(element, visValue, moveFactorX, xDT, moveBy);
    }
    if(visConceptY == visConcept) {
      let visOptions = helperGetVisOptions(element, defaultValue).split(",");
      let moveFactorY = visOptions[1];
      let yDT = 0; // 0 because moveBy is not relative to starting position
      let moveBy = true;
      helperMoveY(element, visValue, moveFactorY, yDT, moveBy);
    }
  })
};

function moveXTo(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveXTo][visConcept=" + visConcept + "]");
  allElements.forEach((element) => {
    let defaultValue = "1, 0";
    let visOptions = helperGetVisOptions(element, defaultValue).split(",");
    let moveFactorX = visOptions[0];
    let xDT = visOptions[1];
    let moveBy = false;
    helperMoveX(element, visValue, moveFactorX, xDT, moveBy);
  })
};

function moveYTo(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveYTo][visConcept=" + visConcept + "]");
  allElements.forEach((element) => {
    let defaultValue = "1, 0";
    let visOptions = helperGetVisOptions(element, defaultValue).split(",");
    let moveFactorY = visOptions[0];
    let yDT = visOptions[1];
    let moveBy = false;
    helperMoveY(element, visValue, moveFactorY, yDT, moveBy);
  })
};

function moveXYTo(visConcept, visValue) {
  let allElements = document.querySelectorAll("[visType=moveXYTo]");
  allElements.forEach((element) => {
    let visConceptSVG = element.getAttribute('visConcept').split(/\s*,\s*/);
    let visConceptX = visConceptSVG[0];
    let visConceptY = visConceptSVG[1];
    let defaultValue = "1, 1, 0, 0";

    if(visConceptX == visConcept) {
      let visOptions = helperGetVisOptions(element, defaultValue).split(",");
      let moveFactorX = visOptions[0];
      let xDT = visOptions[2];
      let moveBy = false;
      helperMoveX(element, visValue, moveFactorX, xDT, moveBy);
    }
    if(visConceptY == visConcept) {
      let visOptions = helperGetVisOptions(element, defaultValue).split(",");
      let moveFactorY = visOptions[1];
      let yDT = visOptions[3];
      let moveBy = false;
      helperMoveY(element, visValue, moveFactorY, yDT, moveBy);
    }
  })
};

// helper function, not its own operation
function helperMoveX(element, visValue, moveFactorX, xDT, moveBy) {
  let id = element.getAttribute('id');
  let moveAmount;
  if(isFinite(Number(moveFactorX))) {
    moveAmount = (visValue - xDT) * moveFactorX;
  } else {
    moveAmount = eval(moveFactorX);
  }
  let xSVG = startingPositions.get(id)[0];
  let transform = element.getAttribute('transform');

  if(transform != null) {
    let svgTransform = element.transform.baseVal.getItem(0);
    let matOld = svgTransform.matrix;
    let matNew = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix();
    
    if(moveBy) {
      xSVG = matOld.e;
    }
    matNew.a = matOld.a;
    matNew.b = matOld.b;
    matNew.c = matOld.c;
    matNew.d = matOld.d;
    matNew.e = xSVG + moveAmount;
    matNew.f = matOld.f;

    svgTransform.setMatrix(matNew);
  } else {
    if(moveBy) {
      xSVG = 0;
    }
    element.setAttribute('transform', `translate(${xSVG + moveAmount}, 0)`);
  }
};

// helper function, not its own operation
function helperMoveY(element, visValue, moveFactorY, yDT, moveBy) {
  let id = element.getAttribute('id');
  let moveAmount;
  if(isFinite(Number(moveFactorY))) {
    moveAmount = (visValue - yDT) * moveFactorY;
  } else {
    moveAmount = eval(moveFactorY);
  }
  let ySVG = startingPositions.get(id)[1];
  let transform = element.getAttribute('transform');

  if(transform != null) {
    let svgTransform = element.transform.baseVal.getItem(0);
    let matOld = svgTransform.matrix;
    let matNew = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix();
    
    if(moveBy) {
      ySVG = matOld.f;
    }
    matNew.a = matOld.a;
    matNew.b = matOld.b;
    matNew.c = matOld.c;
    matNew.d = matOld.d;
    matNew.e = matOld.e;
    matNew.f = ySVG + moveAmount;

    svgTransform.setMatrix(matNew);
  } else {
    if(moveBy) {
      ySVG = 0;
    }
    element.setAttribute('transform', `translate(0, ${ySVG + moveAmount})`);
  }
};

function updateText(visConcept, visValue) {
  let elements = document.querySelectorAll("[visType=updateText][visConcept=" + visConcept + "] tspan[visValue=main]");
  elements.forEach((element) => {
    element.textContent = visValue;
  })
};

function updateFloat(visConcept, visValue) {
  let visValueFloat = visValue;
  if (typeof visValue === "string") {
    visValueFloat = parseFloat(visValue);
  }
  let elements = document.querySelectorAll("[visType=updateFloat][visConcept=" + visConcept + "] tspan[visValue=main]");
  elements.forEach((element) => {
    let defaultValue = 2;
    let decimals = Number(helperGetVisOptions(element, defaultValue));
    element.textContent = visValueFloat.toFixed(decimals);
  })
};

function historyFixed(visConcept) {
  let groups = document.querySelectorAll("[visType=historyFixed][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    element = group.querySelector("rect[visValue=main]");
    xAxis = group.querySelector("g[visValue=zero]");
    
    element.setAttribute("visibility", "hidden");
    let historyArray = historyMap.get(visConcept);
    let historyLength = historyArray.length;
    if(historyLength === 0) {
      return;
    }

    // get values from rect
    let defaultValue = "5, 1, 0, 10";
    let visOptions = helperGetVisOptions(element, defaultValue).split(",");
    let quantity = Number(visOptions[0]);
    let distanceFactor = Number(visOptions[1]);
    let minValue = Number(visOptions[2]);
    let maxValue = Number(visOptions[3]);
    let bbox = element.getBBox();
    let rectWidth = bbox.width;
    let rectHeight = bbox.height;
    let rectX = bbox.x;
    let rectY = bbox.y;

    // calculate bar and gap width
    let barWidth = rectWidth / (quantity + (quantity * distanceFactor));
    let gapWidth = barWidth * distanceFactor;
    let gapWidthHalved = gapWidth / 2;

    // calculate zero point
    if(minValue > 0) {
      minValue = 0;
    }
    let valueRange = maxValue - minValue;
    let heightFactor = (rectHeight / valueRange);
    let zeroPosition = rectY + (heightFactor * maxValue);
    if(valueRange == 0) {
      heightFactor = 0;
      zeroPosition = rectY + rectHeight;
    }

    // move x-Axis to zero point
    if(minValue < 0) {
      let transform = xAxis.getAttribute('transform');

      function getParentScaleY(el) {
        const parent = el.parentNode;
        if (!parent || typeof parent.transform !== 'object') {
          return 1;                    // kein Parent oder kein <g>
        }

        const tList = parent.transform.baseVal;
        if (tList.numberOfItems === 0) {
          return 1;                    // Parent hat gar keinen transform
        }

        // Eine konsolidierte Matrix des Parent-eigenen transform
        const m = tList.consolidate().matrix;

        // Skalenanteil |(c,d)|   (funktioniert auch bei Rotationen / Skews)
        return Math.hypot(m.c, m.d);
      }
      let scaleY = getParentScaleY(xAxis);
      console.log(scaleY);
      let moveValue = ((rectY + rectHeight) - zeroPosition) / scaleY;
      console.log(rectY);
      console.log(rectHeight);
      console.log(zeroPosition);
      console.log(moveValue);
      console.log("Effektiver Y-Versatz:", xAxis.getCTM());

      if(transform != null) {
        let svgTransform = xAxis.transform.baseVal.getItem(0);
        let matOld = svgTransform.matrix;
        let matNew = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix();
        console.log(svgTransform);
        console.log(matOld);
        
        matNew.a = matOld.a;
        matNew.b = matOld.b;
        matNew.c = matOld.c;
        matNew.d = matOld.d;
        matNew.e = matOld.e;
        matNew.f = matOld.f - moveValue;
        console.log(matNew);
  
        svgTransform.setMatrix(matNew);
        console.log("Effektiver Y-Versatz:", xAxis.getCTM());
      } else {
        xAxis.setAttribute('transform', `translate(0, ${-moveValue})`);
      }
    }

    // remove previous clones
    let previousClones = document.querySelectorAll("[visValue=" + element.id + "_clone");
    previousClones.forEach((element) => {
      element.remove();
    })

    let maxQuantity = quantity
    if(historyLength < quantity) {
      maxQuantity = historyLength;
    }

    // calculate bar x and y positions and add clones
    let sectionX = rectX;
    for(let i = historyLength - maxQuantity; i < historyLength; i++ ) {
      let barX = sectionX + gapWidthHalved;
      sectionX = barX + barWidth + gapWidthHalved;
      let barValue = historyArray[i];
      if(barValue < 0) {
        barHeight = heightFactor * Math.abs(barValue);
        barY = zeroPosition;
      }
      else {
        barHeight = heightFactor * barValue;
        barY = zeroPosition - barHeight;
      }

      let clone = element.cloneNode();
      clone.setAttribute("visibility", "visible");
      clone.setAttribute("visValue", `${element.id}_clone`);
      clone.setAttribute("width", barWidth);
      clone.setAttribute("height", barHeight);      
      clone.setAttribute("x", barX);
      clone.setAttribute("y", barY);
      element.parentNode.insertBefore(clone, element.parentNode.firstChild);
    }
  })
};

function historyDynamic(visConcept) {
  let groups = document.querySelectorAll("[visType=historyDynamic][visConcept=" + visConcept + "]");
  groups.forEach((group) => {
    element = group.querySelector("rect[visValue=main]");
    xAxis = group.querySelector("[visValue=zero]");

    let historyArray = historyMap.get(visConcept);
    let historyLength = historyArray.length;
    if(historyLength === 0) {
      return;
    }

    // get values from rect
    let defaultValue = "5, 1";
    let visOptions = helperGetVisOptions(element, defaultValue).split(",");
    let quantity = Number(visOptions[0]);
    let distanceFactor = Number(visOptions[1]);
    let minValue = minValuesMap.get(visConcept);
    let maxValue = maxValuesMap.get(visConcept);
    let bbox = element.getBBox();
    let rectWidth = bbox.width;
    let rectHeight = bbox.height;
    let rectX = bbox.x;
    let rectY = bbox.y;

    // calculate bar and gap width
    let barWidth = rectWidth / (quantity + (quantity * distanceFactor));
    let gapWidth = barWidth * distanceFactor;
    let gapWidthHalved = gapWidth / 2;

    // calculate zero point
    if(minValue > 0) {
      minValue = 0;
    }
    let valueRange = maxValue - minValue;
    let heightFactor = (rectHeight / valueRange);
    let zeroPosition = rectY + (heightFactor * maxValue);
    if(valueRange == 0) {
      heightFactor = 0;
      zeroPosition = rectY + rectHeight;
    }

    // move x-Axis to zero point
    if(minValue < 0) {
      let transform = xAxis.getAttribute('transform');
      let moveValue = (rectY + rectHeight) - zeroPosition;

      if(transform != null) {
        let svgTransform = xAxis.transform.baseVal.getItem(0);
        let matOld = svgTransform.matrix;
        let matNew = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix();
  
        matNew.a = matOld.a;
        matNew.b = matOld.b;
        matNew.c = matOld.c;
        matNew.d = matOld.d;
        matNew.e = matOld.e;
        matNew.f = -moveValue;
  
        svgTransform.setMatrix(matNew);
      } else {
        xAxis.setAttribute('transform', `translate(0, ${-moveValue})`);
      }
    }

    // remove previous clones
    let previousClones = document.querySelectorAll("[visValue=" + element.id + "_clone");
    previousClones.forEach((element) => {
      element.remove();
    })

    let maxQuantity = quantity
    if(historyLength < quantity) {
      maxQuantity = historyLength;
    }

    // calculate bar x and y positions and add clones
    let sectionX = rectX;
    for(let i = historyLength - maxQuantity; i < historyLength; i++ ) {
      let barX = sectionX + gapWidthHalved;
      sectionX = barX + barWidth + gapWidthHalved;
      let barValue = historyArray[i];
      if(barValue < 0) {
        barHeight = heightFactor * Math.abs(barValue);
        barY = zeroPosition;
      }
      else {
        barHeight = heightFactor * barValue;
        barY = zeroPosition - barHeight;
      }

      let clone = element.cloneNode(true);
      clone.setAttribute("visibility", "visible");
      clone.setAttribute("visValue", `${element.id}_clone`);
      clone.setAttribute("width", barWidth);
      clone.setAttribute("height", barHeight);
      clone.setAttribute("x", barX);
      clone.setAttribute("y", barY);
      element.parentNode.insertBefore(clone, element.parentNode.firstChild);
      clone.setAttribute("visibility", "visible");
    }
  })
};

// helper function, not its own operation
function helperGetVisOptions(element, defaultValue) {
  if(element.hasAttribute('visOptions')) {
    return element.getAttribute('visOptions');
  }
  else {
    return defaultValue;
  }
}