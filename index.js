let fs = require('fs');
let csvjson = require('csvjson');
let path = require('path');

let networkBandwidth=40;
let budget=37;//budget in euro

let inputPrice='./assignments/price.csv';
let inputTime='./assignments/task_time_instance.csv';
let inputTraffic='./assignments/traffic_relation.csv';

let dataPrice = fs.readFileSync(path.join(__dirname, inputPrice), { encoding : 'utf8'});
let dataTime = fs.readFileSync(path.join(__dirname, inputTime), { encoding : 'utf8'});
let dataTraffic = fs.readFileSync(path.join(__dirname, inputTraffic), { encoding : 'utf8'});

let options = {
    delimiter : ',',
    quote     : '"'
};

let price=csvjson.toObject(dataPrice, options);
let time=csvjson.toObject(dataTime, options);
let traffic=csvjson.toObject(dataTraffic, options);

//this function returns an array of task ids, that need the result of task with (id)
const dependsOn=(id)=>{
    let result=[];
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        if(d.task===id){
            delete d.task;
            for (key in d){
                if(d[key]!==''){
                    result.push(key);
                }
            }
        }

    });
    return result;
};

//this function returns an array of task ids, that are must be finished before the task with(id) can start
const isDependentOn=(id)=>{
    let result=[];
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        let t=d.task;
        delete d.task;
        for (key in d){
            if (d[key]!=='' && key==id){
                result.push(t);
            }
        }
    });
    return result;
};

const costs=(fromID, toID)=>{
    let temp={};
    let trafficCopy=JSON.parse(JSON.stringify(traffic));
    trafficCopy.forEach(function (d){
        if(d.task==fromID){
            temp=d;
        }
    });
    let size=temp[toID];
    return size / networkBandwidth; //in seconds
};

const takesTime=(id, instance)=>{
    let tmp;
   time.forEach(function(t){
       if(t.task==id){
           tmp = t[instance];
       }
   });
   return parseFloat(tmp);
};

const getAllTasks=()=>{
    let tmp=[];
    time.forEach(function(t){
        tmp.push(t.task);
    });
    return tmp;
};

const getAllInstances=()=>{
    let tmp=[];
    price.forEach(function(p){
        tmp.push(p.id);
    });
    return tmp;
};


const averageComputationCostAmongAllNodes=(id)=> {
    let count=0;
    price.forEach(function (instance){
        count+=takesTime(id,instance.id);
    });
    return (count/price.length);
};

//conputes the Cij from Prioritizing tasks (https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time)
const computAverageComputationCostsAmongAllNodes=(i, j)=> {
    let all=0;
    for(let t=0; t<=price.length-1;t++){
        all=all+costs(i,j);
    }
    return all/price.length;
};

//implements the prioritizing algorithm from https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time
//task is an ID of a task
const computePriority=(task)=>{
    let w=averageComputationCostAmongAllNodes(task);
    let succ=dependsOn(task);
    let i=task;

    let max=0;
    succ.forEach(function(j){
        let c=computAverageComputationCostsAmongAllNodes(i,j);
        let currentCost=c+computePriority(j);
        if(max<currentCost){
            max=currentCost;
        }
    });
    return w+max;
};

//returns a prioritized and sorted list of tasks
const prioritize=()=>{
    let result=[];
    getAllTasks().forEach(function(t){
        result.push({
            priorityScore: computePriority(t),
            id:t
        });
    });
    result.sort((a, b) => b.priorityScore - a.priorityScore);
    return result;
};

const checkIfTaskCompleted=(id,serverAssignments)=>{
    let found=undefined;
    serverAssignments.completedTasks.forEach(function(a){
        if(a.taskId===id){
            found=a;
        }
    });
    return found;
};

function assignToBestWorker(task, serverAssignments) {
    let mustWaitFor=isDependentOn(task);
    let mustWaitForArray=[];
    let allFinished=true;
    mustWaitFor.forEach(function (id){
        let temp=checkIfTaskCompleted(id,serverAssignments);
        if(temp===undefined){
            allFinished= false;
        }else{
            mustWaitForArray.push(temp)
        }
    });

    if(!allFinished){
        return undefined
    }

    //let computationTime=[]; //times how long the computation takes for each server
    let availableList=serverAssignments.serverList;
    let bestStartTime=9999999999;
    let bestFinishTime=9999999999;
    let bestWorkerID;

    for (let i=0; i<price.length; i++){
        let earliestStartTime=0; //time when all tasks that are dependent are finished;
        mustWaitFor.forEach(function(w){
            if((w.finishTime + costs(w.serverId,price[i].id)) > earliestStartTime ){
                earliestStartTime=w.finishTime + costs(w.serverId,price[i].id);
            }
        });

        let startTime=Math.max(availableList[i], earliestStartTime);

        let finishTime=startTime+takesTime(task,price[i].id);
        if(bestFinishTime > finishTime ){
            bestStartTime=startTime;
            bestFinishTime=finishTime;
            bestWorkerID=i;
        }
    }

    serverAssignments.completedTasks.push({
        taskId:task,
        serverId:bestWorkerID,
        startTime:bestStartTime,
        tookTime:bestFinishTime-bestStartTime,
        finishTime:bestFinishTime
    });
    availableList[bestWorkerID]=bestFinishTime;
    return true;
}

function calcMakespan(data) {
    let result=0;
    data.forEach(function(d){
        if(d>result){
            result=d;
        }
    });
    return result;
}


const currentCostsForServers=(data)=>{
    let result={};
    result.single=[];
    result.total=0;
    let i=0;
    data.forEach(function(x){
        let hourInSeconds=3600;
        let time=x;
        let costsperHour=parseFloat(price[i].Price);
        let fullHours=Math.ceil(time/hourInSeconds);
        let t=fullHours*costsperHour;

        result.total+=t;
        result.single.push({
            server:i,
            time:x,
            chargedHours:fullHours,
            costs:t
        });
        i++;
    });

    return result;
};

//the function that assigns sorted task list to workers;
const assignToWorkers=(taskList)=>{
    let tempList=JSON.parse(JSON.stringify(taskList));
    let serverAssignments= {
        completedTasks:[], //an array of completed tasks, with their id, the server id they were assigned to, a starting time and an ending time;
        serverList:[], //an array for every server, when he is available
    };
    serverAssignments.serverList=new Array(price.length).fill(0); //assign a starttime

    let loop=true;
    let loopCount=0;
    while(tempList.length>0 && loop){
        loop=false;
        loopCount++;
        let temp=[];
        tempList.forEach(function(task){
            let couldAssignTask=assignToBestWorker(task.id,serverAssignments);
            if(couldAssignTask){
                loop=true;
            }else{
                //could not assign this task;
                temp.push(task);
                console.log('______________________');
                console.log(task.id);
                console.log("DEPENDS ON: "+isDependentOn(task.id));
                let arr=[];
                serverAssignments.completedTasks.forEach(function(x){
                    arr.push(x.taskId);
                });
                console.log("HAVE: "+arr);
            }
        });
        console.log(temp);
        tempList=temp;
    };
    if(!loop){
        ///TODO: maxbe increase all start times
        console.log('could not assign all tasks');

    }
    let arr=[];
    serverAssignments.completedTasks.forEach(function(x){
        arr.push(x.taskId);
    });
    return serverAssignments;
};

let result=assignToWorkers(prioritize());
console.log("Makespan: "+calcMakespan(result.serverList)+" seconds");
console.table(result.completedTasks);
console.log("Total cost: "+ currentCostsForServers(result.serverList).total);
console.table(currentCostsForServers(result.serverList).single);

//console.table(assignToWorkers(prioritize()));







