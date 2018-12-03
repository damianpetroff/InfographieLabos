$( document ).ready(function() {
    var textCanvas = document.getElementById("text");
    var ctx = textCanvas.getContext("2d");
    ctx.font = "50px Segoe UI Light";
    ctx.fillText("Labo 2 : 3D Game of Life", 300, 38);
    ctx.restore();
    var sliderRules = new Slider('#rangeRules', {});
    var sliderSize = new Slider('#rangeSize', {});
    var sliderSpeed = new Slider('#rangeSpeed', {});
});
var currentTexID = 1;
const maxSample = 1;
var gridSize = 100;
var theGrid = createArray(gridSize);
var mirrorGrid = createArray(gridSize);
var valueOfCases = createArray(gridSize);
var vertexBuffer = null;
var indexBuffer = null;
var colorBuffer= null;
var normalBuffer = null;
var textCoordsBuffer = null;
var texColorTab = new Array();
var indices = [];
var vertices = [];
var colors= [];
var normals = [];
var textCoords =[];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var nMatrix = mat4.create();

function initLights(value){
    glContext.uniform3f(prg.lightPositionUniform, 0, 0, value);
}

function setResetLightVector(checkboxID){
  if( document.getElementById(checkboxID).checked )	{
    initLights(1);
  }
  else{
    initLights(0);
  }
}

function initShaderParameters(prg) {
  prg.vertexPositionAttribute = glContext.getAttribLocation(prg, "aVertexPosition");
  glContext.enableVertexAttribArray(prg.vertexPositionAttribute);
  prg.vertexNormalAttribute = glContext.getAttribLocation(prg, "aVertexNormal");
  glContext.enableVertexAttribArray(prg.vertexNormalAttribute);
  prg.textureCoordsAttribute  = glContext.getAttribLocation(prg, "aTextureCoord");
  glContext.enableVertexAttribArray(prg.textureCoordsAttribute);
  prg.colorAttribute = glContext.getAttribLocation(prg, "aColor");
  glContext.enableVertexAttribArray(prg.colorAttribute);
  prg.pMatrixUniform = glContext.getUniformLocation(prg, 'uPMatrix');
  prg.mvMatrixUniform = glContext.getUniformLocation(prg, 'uMVMatrix');
  prg.nMatrixUniform = glContext.getUniformLocation(prg, 'uNMatrix');
  prg.lightPositionUniform = glContext.getUniformLocation(prg, 'uLightPosition');
  prg.colorTextureUniform = glContext.getUniformLocation(prg, "uColorTexture");
}

function initBuffers() {
  vertices.push(-1.0,-1.0, 0);
  vertices.push( 1.0,-1.0, 0);
  vertices.push(-1.0, 1.0, 0);
  vertices.push( 1.0, 1.0, 0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  normals.push(0.0, 0.0, 1.0);
  normals.push(0.0, 0.0, 1.0);
  normals.push(0.0, 0.0, 1.0);
  normals.push(0.0, 0.0, 1.0);
  indices.push(0, 1, 2);
  indices.push(1, 2, 3);
  textCoords.push(0.0, 0.0);
  textCoords.push(1.0, 0.0);
  textCoords.push(0.0, 1.0);
  textCoords.push(1.0, 1.0);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  vertexBuffer = getVertexBufferWithVertices(vertices);
  colorBuffer = getVertexBufferWithVertices(colors);
  indexBuffer = getIndexBufferWithIndices(indices);
  textCoordsBuffer = getArrayBufferWithArray(textCoords);
  normalBuffer = getVertexBufferWithVertices(normals);
}

function drawScene() {
  glContext.clearColor(1.0, 1.0, 1.0, 1.0);
  glContext.enable(glContext.DEPTH_TEST);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
  glContext.viewport(0, 0, c_width, c_height);
  mat4.perspective(pMatrix, degToRad(60), c_width / c_height, 0.1, 1000.0);
  mat4.translate(pMatrix, pMatrix, [0.0, 0.0, -1.75]);
  rotateModelViewMatrixUsingQuaternion(true);
  glContext.uniformMatrix4fv(prg.pMatrixUniform, false, pMatrix);
  glContext.uniformMatrix4fv(prg.mvMatrixUniform, false, mvMatrix);
  mat4.copy(nMatrix, mvMatrix);
  mat4.invert(nMatrix, nMatrix);
  mat4.transpose(nMatrix, nMatrix);
  glContext.uniformMatrix4fv(prg.nMatrixUniform, false, nMatrix);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, normalBuffer);
  glContext.vertexAttribPointer(prg.vertexNormalAttribute, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
  glContext.vertexAttribPointer(prg.vertexPositionAttribute, 3, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, colorBuffer);
  glContext.vertexAttribPointer(prg.colorAttribute, 4, glContext.FLOAT, false, 0, 0);
  glContext.bindBuffer(glContext.ARRAY_BUFFER, textCoordsBuffer);
  glContext.vertexAttribPointer(prg.textureCoordsAttribute, 2, glContext.FLOAT, false, 0, 0);
  glContext.activeTexture(glContext.TEXTURE0);
  glContext.bindTexture(glContext.TEXTURE_2D, texColorTab[currentTexID-1]);
  glContext.uniform1i(prg.colorTextureUniform, 0);
  glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
  glContext.drawElements(glContext.TRIANGLES, indices.length, glContext.UNSIGNED_SHORT, 0);

}

function initWebGL() {
  glContext = getGLContext('webgl-canvas');
  initProgram();
  initBuffers();
  initTextureWithImage( "fig/tree.png", texColorTab );
  initLights(1);
  resetGame(gridSize);
  tick();
  renderLoop();
}

var tickClock = 10;
var tickCpt = 0;
var tickSpeed = 9;
var TICKMAXSPEED = 10;
//functions
function tick() { //main loop
  if (tickCpt % (TICKMAXSPEED - tickSpeed + 1) == 0)
  {
    updateGrid();
    drawGrid();
  }
  requestAnimationFrame(tick);
  tickCpt+=1;
}

function resetGame(n){
  gridSize = n;
  theGrid = createArray(gridSize);
  mirrorGrid = createArray(gridSize);
  valueOfCases = createArray(gridSize);
  for(var i = 0; i < gridSize; i++)
  {
    for(var j=0; j < gridSize; j++)
    {
      valueOfCases[i][j] = 0;
    }
  }
  fillRandom();
}

function createArray(rows) { //creates a 2 dimensional array of required height
    var arr = [];
    for (var i = 0; i < rows; i++) {
        arr[i] = [];
    }
    return arr;
}

function fillRandom() { //fill the grid randomly
    for (var j = 0; j < gridSize; j++) { //iterate through rows
        for (var k = 0; k < gridSize; k++) { //iterate through columns
            theGrid[j][k] = Math.round(Math.random());
        }
    }
}

function drawGrid() { //draw the contents of the grid onto a canvas
  var liveCount = 0;
  colors=[];
  vertices=[];
  indices=[];
  var n = gridSize;
  delta = 2.0/n;
  cpt = 4;
  vertices.push(-1.0,-1.0, 0);
  vertices.push( 1.0,-1.0, 0);
  vertices.push(-1.0, 1.0, 0);
  vertices.push( 1.0, 1.0, 0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  colors.push(0.0, 1.0, 0.0, 1.0);
  indices.push(0, 1, 2);
  indices.push(1, 2, 3);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  normals.push(0, 0,-1);
  for (var i = 0; i < gridSize; i++) { //iterate through rows
    for (var j = 0; j < gridSize; j++) { //iterate through columns
      if (theGrid[i][j] === 1) {
        valueOfCases[i][j]++;
        value = Math.log(valueOfCases[i][j]+1)/10.0;

        if(value < 0.25)
        {
          colors.push(1.0, value*4.0, 0.0, 1.0);
          colors.push(1.0, value*4.0, 0.0, 1.0);
          colors.push(1.0, value*4.0, 0.0, 1.0);
          colors.push(1.0, value*4.0, 0.0, 1.0);
        }
        else if (value < 1.25){
          colors.push(1.25-value, 1.0, 0.0, 1.0);
          colors.push(1.25-value, 1.0, 0.0, 1.0);
          colors.push(1.25-value, 1.0, 0.0, 1.0);
          colors.push(1.25-value, 1.0, 0.0, 1.0);
        }
        else {
          colors.push(0.0, 1.0, 0.0, 1.0);
          colors.push(0.0, 1.0, 0.0, 1.0);
          colors.push(0.0, 1.0, 0.0, 1.0);
          colors.push(0.0, 1.0, 0.0, 1.0);
        }

        gray = 0.1;
        colors.push(gray, gray, gray, 1.0);
        colors.push(gray, gray, gray, 1.0);
        colors.push(gray, gray, gray, 1.0);
        colors.push(gray, gray, gray, 1.0);

        vertices.push((i/n)*2-1, (j/n)*2-1, value);
        vertices.push((i/n)*2-1+delta, (j/n)*2-1, value);
        vertices.push((i/n)*2-1, (j/n)*2-1+delta, value);
        vertices.push((i/n)*2-1+delta, (j/n)*2-1+delta, value);
        vertices.push((i/n)*2-1, (j/n)*2-1, 0);
        vertices.push((i/n)*2-1+delta, (j/n)*2-1, 0);
        vertices.push((i/n)*2-1, (j/n)*2-1+delta, 0);
        vertices.push((i/n)*2-1+delta, (j/n)*2-1+delta, 0);

        indices.push(cpt, cpt+1, cpt+2);
        indices.push(cpt+1, cpt+2, cpt+3);
        indices.push(cpt, cpt+2, cpt+4);
        indices.push(cpt+6, cpt+2, cpt+4);
        indices.push(cpt+2, cpt+3, cpt+7);
        indices.push(cpt+2, cpt+6, cpt+7);
        indices.push(cpt+3, cpt+1, cpt+7);
        indices.push(cpt+5, cpt+1, cpt+7);
        indices.push(cpt, cpt+1, cpt+4);
        indices.push(cpt+5, cpt+1, cpt+4);
        cpt+=8;
        liveCount++;
      }
      else {
        valueOfCases[i][j] = 0;
      }
    }
  }
  colorBuffer = getVertexBufferWithVertices(colors);
  vertexBuffer = getVertexBufferWithVertices(vertices);
  indexBuffer = getIndexBufferWithIndices(indices);
  normalBuffer = getVertexBufferWithVertices(normals);
}

var downBound = 2;
var upBound = 3;

function updateGrid() { //perform one iteration of grid update
    for (var j = 1; j < gridSize-1; j++) { //iterate through rows
        for (var k = 1; k < gridSize-1; k++) { //iterate through columns
            var totalCells = 0;
            //add up the total values for the surrounding cells
            totalCells += theGrid[j - 1][k - 1]; //top left
            totalCells += theGrid[j - 1][k]; //top center
            totalCells += theGrid[j - 1][k + 1]; //top right

            totalCells += theGrid[j][k - 1]; //middle left
            totalCells += theGrid[j][k + 1]; //middle right

            totalCells += theGrid[j + 1][k - 1]; //bottom left
            totalCells += theGrid[j + 1][k]; //bottom center
            totalCells += theGrid[j + 1][k + 1]; //bottom right

            //apply the rules to each cell
            if(totalCells == downBound) {
              mirrorGrid[j][k] = theGrid[j][k];
            }
            else if(totalCells > downBound && totalCells<=upBound) {
              mirrorGrid[j][k] = 1; //live
            }
            else {
              mirrorGrid[j][k] = 0; //die
            }
        }
    }

    //mirror edges to create wraparound effect
    for (var l = 1; l < gridSize - 1; l++) { //iterate through rows
        //top and bottom
        mirrorGrid[l][0] = mirrorGrid[l][gridSize - 3];
        mirrorGrid[l][gridSize - 1] = mirrorGrid[l][1];
        //left and right
        mirrorGrid[0][l] = mirrorGrid[gridSize - 3][l];
        mirrorGrid[gridSize - 1][l] = mirrorGrid[1][l];
    }


    //swap grids
    var temp = theGrid;
    theGrid = mirrorGrid;
    mirrorGrid = temp;
}
