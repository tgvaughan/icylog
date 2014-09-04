
/****************************
          PROTOTYPES
 ****************************/

/**
* Prototype object representing the data contained in a log file.
*/
var Log = Object.create({}, {
    variableLogs: {value: [], writable: true},
    variableNames: {value: [], writable: true},

    // Initialiser
    init: {value: function(logFileString, colSep) {
        this.variableLogs = [];
        this.variableNames = [];

        var lines = logFileString.split('\n');

        var headerRead = false;
        var sampleIdxCol = 0;

        for (var i=0; i<lines.length; i++) {
            var thisLine = lines[i].trim();

            // Skip newlines and comments
            if (thisLine.length == 0 || thisLine[0] == "#")
                continue;

            var fields = thisLine.split(colSep);

            if (!headerRead) {

                // Read header

                for (var fidx=0; fidx<fields.length; fidx++) {
                    if (fields[fidx].toLowerCase() === "sample") {
                        sampleIdxCol = fidx;
                        continue;
                    }

                    var varLog = Object.create(VariableLog, {}).init(fields[fidx]);
                    this.variableLogs.push(varLog);
                    this.variableNames.push(fields[fidx]);
                }

                headerRead = true;

            } else {

                // Read sample record

                var vidx = 0;
                for (var fidx=0; fidx<fields.length; fidx++) {
                    if (fidx==sampleIdxCol)
                        continue;

                    this.variableLogs[vidx].addSample(fields[fidx], fields[sampleIdxCol]);
                    vidx += 1;
                }

            }

        }

        return this;
    }},

    setBurninFrac: {value: function(newBurnin) {
        for (var vidx=0; vidx<this.variableLogs.length; vidx++) {
            this.variableLogs[vidx].setBurninFrac(newBurnin);
            this.variableLogs[vidx].invalidateStats();
        }
    }}
});

/**
* Prototype object representing a log of a single variable
*/
var VariableLog = Object.create({}, {
    name: {value: "", writable: true},
    samples: {value: [], writable: true},
    sampleIndices: {value: [], writable: true},
    sampleRecords: {value: [], writable: true},

    ESS: {value: undefined, writable: true},
    ESScalcSteps: {value: 5000, writable: true},

    mean: {value: undefined, writable: true},
    variance: {value: undefined, writable: true},
    HPDandMedian: {value: undefined, writable: true},
    range: {value: undefined, writable: true},

    histogram: {value: undefined, writable: true},

    burninFrac: {value: 0.1, writable: true},

    init: {value: function(name) {
        this.name = name;
        this.samples = [];
        this.sampleIndices = [];
        this.sampleRecords = [];
        this.ESS = [];

        return this;
    }},

    addSample: {value: function(sampleStr, sampleIdxStr) {

        var sample = parseFloat(sampleStr);
        var sampleIdx = parseInt(sampleIdxStr);

        // Include sample in sample list
        this.samples.push(sample);
        this.sampleIndices.push(sampleIdx);
        this.sampleRecords.push([sampleIdx, sample, null, null, null]);

        // Clear existing mean and 95% HPDs
        this.sampleStart = Math.floor(this.burninFrac*this.samples.length);
        this.invalidateStats();
    }},

    setBurninFrac: {value: function(newBurninFrac) {
        this.burninFrac = newBurninFrac;
        this.sampleStart = Math.floor(this.burninFrac*this.samples.length);
    }},

    // Invalidate previously calculated stats
    invalidateStats: {value: function() {
        this.mean = undefined;
        this.variance = undefined;
        this.HPDandMedian = undefined;
        this.ESS = undefined;
        this.range = undefined;
        this.histogram = undefined;
    }},

    /**
     * Calculate rough ESS using at most as many samples as specified
     * by ESScalcSteps.
     */
    getESS: {value: function() {
        if (this.ESS == undefined) {

            var N = this.samples.length - this.sampleStart;
            var step = Math.ceil(Math.max(1, N/this.ESScalcSteps));
            var n = Math.floor(N/step);

            var roughMean = 0.0;
            var roughStd = 0.0;

            for (var i=0; i<n; i++) {
                var thisVal = this.samples[this.sampleStart+i*step];
                roughMean += thisVal;
                roughStd += thisVal*thisVal;
            }
            roughMean /= n;
            roughStd = Math.sqrt(roughStd/n - roughMean*roughMean);

            var real = new Array(n);
            var imag = new Array(n);

            for (var i=0; i<n; i++) {
                real[i] = (this.samples[this.sampleStart+i*step] - roughMean)/roughStd;
                imag[i] = 0.0;
            }

            transform(real, imag);

            for (i=0; i<n; i++) {
                real[i] = real[i]*real[i] + imag[i]*imag[i];
                imag[i] = 0.0;
            }

            inverseTransform(real, imag);

            // Sum ACF until autocorrelation dips below 0.
            // (Seems to yield decent agreement with Tracer.)
            var sumRho = 0.0;
            for (i=0; i<n; i++) {
                real[i] /= n*n;

                if (i>1 && (real[i-1] + real[i]) < 0)
                    break;
                else
                    sumRho += real[i];
            }

            // Magic formula for calculating ESS.
            this.ESS = n/(1 + 2*sumRho);
        }

        return this.ESS;
    }},

    getMean: {value: function() {
        if (this.mean == undefined) {
            var n = this.samples.length - this.sampleStart;
            
            this.mean = 0.0;
            for (var i=0; i<n; i++) {
                this.mean += this.samples[i+this.sampleStart];
            }
            this.mean /= n;
        }

        return this.mean;
    }},

    getVariance: {value: function() {
        if (this.variance == undefined) {
            var n = this.samples.length - this.sampleStart;
            
            this.variance = 0.0;
            for (var i=0; i<n; i++) {
                this.variance += this.samples[i+this.sampleStart]*this.samples[i+this.sampleStart];
            }
            this.variance /= n;
            this.variance -= this.getMean()*this.getMean();
        }

        return this.variance;
    }},

    getMedian: {value: function() {
        return this.getHPDandMedian()[2];
    }},

    getHPDlower: {value: function() {
        return this.getHPDandMedian()[0];
    }},

    getHPDupper: {value: function() {
        return this.getHPDandMedian()[1];
    }},

    getHPDandMedian: {value: function() {
        if (this.HPDandMedian == undefined) {
            var sorted = this.samples.slice(this.sampleStart).sort(
                function(a,b) {return a-b;});

            var n = sorted.length;
            var lower = sorted[Math.round(0.025*n)];
            var upper = sorted[Math.round(0.975*n)];
            var median = sorted[Math.round(0.5*n)];

            this.HPDandMedian = [lower, upper, median];
        }

        return this.HPDandMedian;
    }},

    getRange: {value: function() {
        if (this.range == undefined) {
            this.range = [Math.min.apply(null, this.samples.slice(this.sampleStart)),
                          Math.max.apply(null, this.samples.slice(this.sampleStart))];
        }

        return this.range;
    }},

    /**
     * Retrieve the sample records corresponding to this variable.
     *
     * Omits burnin.
     */
    getSampleRecords: {value: function() {

        var sampleRecords = this.sampleRecords.slice(this.sampleStart);

        if (sampleRecords.length>0) {
            sampleRecords[0][2] = this.getMedian();
            sampleRecords[sampleRecords.length-1][2] = this.getMedian();
            sampleRecords[0][3] = this.getHPDlower();
            sampleRecords[sampleRecords.length-1][3] = this.getHPDlower();
            sampleRecords[0][4] = this.getHPDupper();
            sampleRecords[sampleRecords.length-1][4] = this.getHPDupper();
        }

        return sampleRecords;
    }},

    /**
     * Retrieve a histogram summarizing this log, excluding burnin.
     */
    getHistogram: {value: function() {

        if (this.histogram == undefined) {

            var range = this.getRange();
            var nSamples = this.samples.length - this.sampleStart;            

            // Sturges' rule
            var nBins = Math.ceil(Math.log(nSamples)/Math.log(2) + 1);

            // "Excel" rule  (maybe makes sense with Poissonian noise?)
            //var nBins = Math.ceil(Math.sqrt(nSamples)); 

            var binwidth = (range[1]-range[0])/nBins;

            this.histogram = [];
            for (var i=0; i<nBins; i++)
                this.histogram[i] = [range[0]+binwidth*(i+0.5), 0];

            for (var i=this.sampleStart; i<this.samples.length; i++) {
                var thisBin = Math.floor((this.samples[i]-range[0])/binwidth);

                if (thisBin==nBins && this.samples[i]==range[1])
                    thisBin -= 1;

                this.histogram[thisBin][1] += 1;
            }
        }

        return this.histogram;

    }},

    /**
     * Convert ESS to colour string.
     */
    getESSColour: {value: function() {

        var goodness = Math.min(1.0, this.getESS()/200.0);

        var red, green;
        if (goodness<0.5) {
            red = Math.round(255*0.8);
            green = Math.round(255*0.8*goodness/0.5);
        } else {
            green = Math.round(255*0.8);
            red = Math.round(255*0.8*(1.0-goodness)/0.5);
        }
        
        return "#" +
            ("00" + red.toString(16)).slice(-2) +
            ("00" + green.toString(16)).slice(-2) + "00";
    }},

    getStatsString: {value: function() {
        return "ESS: " + this.getESS().toPrecision(5) + " (rough, max 5000)\n" +
            "Mean: " + this.getMean().toPrecision(5) + "\n" +
            "Median: " + this.getMedian().toPrecision(5) + "\n" +
            "Variance: " + this.getVariance().toPrecision(5) + "\n" +
            "95% HPD interval: [" + this.getHPDlower().toPrecision(5) +
            ", " + this.getHPDupper().toPrecision(5) + "]";
    }}
});