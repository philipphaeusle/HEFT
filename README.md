# Assignment 7 Workflow Scheduler

## Introduction

The solution is based on approaches suggested within the paper: Scheduling Workflows with Budget Constraints. First a HEFT algorithm is implemented and then the LOSS approach is used to validate if the current solution is not only the fastest concerning execution time, but also is within a given budget.

##### Done by
Phillip Häusle &
Dennis Sommer

## Implementation 

For this implementation the wikipedia article: https://en.wikipedia.org/wiki/Heterogeneous_Earliest_Finish_Time is used to structure the development. 
As described the first step is to prioritize the tasks. Therefore the average computation and communication time is calculated. 
The prioritization of a task is not independent from other tasks, since some depend on conclusion of other tasks. 

Afterwards the tasks are assigned to workers. 

The Heft algorithm is done at this point and the LOSS algorithm is implemented to redistribute the tasks on the servers to obtain a solution, which stays inside the defined budget.  

### index.js 

#### dependsOn 
function, which gets a TaskID and determines which other task it depends on. 
In example task 7 needs task 0 to be finished to start.

#### isDependentOn
function, which gets a TaskID and determines, on which other function it is dependent on.  
In example task 0 is not dependent on and task. Function will return empty array. 

#### costs
function, determining how much it would cost(time vise) to transfer a task from on server(worker) to another. 

#### takesTime
function, returning how long a task takes on a server (worker)

#### getAllTasks
function, returns all tasks 

#### averageComputationCostAmongAllNodes
Uses the ID of one task, to calculate its average computation cost, meaning: Gets computation time of task on each server/worker and divides it by the number of servers.

#### computAverageComunicationCostsAmongAllNodes
Uses the ID of one server and one task and returns the average time to transfer this task to one of the other servers. 

#### computePriority
Returns the priority of a task, therefore the averageComputationCostAmongAllNodes of the task is computed, then all tasks are took in consideration, which the task dependsOn. 
Now for each of these tasks the computAverageComunicationCostsAmongAllNodes is used for the task on each of the tasks it depends on. 
The final result consists of the max wait time on the servers since even when able to execute the task earlier it still has to wait for all other tasks it dependsOn to finish, and the servers to be free. 

#### prioritize
is the first function to be called, it prioritizes all tasks using the computePriority function. 

#### checkIfTaskCompleted
returns if a task is completed. 

#### assignToBestWorker

#### assignToWorkers

#### executionCosts
returns the execution costs of a task meaning: time multiplied by cost per hour on the server.

#### lossWeight
implementation of the LossWeight algorithm from paper. 

#### calcMakespan
returns the server with the biggest result in concern of finished time on the server, since this is the end of the overall workflow.

#### lossAlgorithm

## Lookout 
The next step in the solution must be to: "Re-assign Task i to Machine j in S and calculate new cost of S". 
Seems pretty straight forward, to realize this in code is actually quite complex, since when a task is shifted to another machine, all tasks running on the machine must be rescheduled in addition to the tasks on the machine were it was shifted to. 

#### reschedule
This is were the algorithm has to be continued from, as described above.