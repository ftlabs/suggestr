# Suggestr

A Follow based recommendation algorithm

Using topic cluster analysis, topic correlations data and topic follow/unfollow ratios - can we suggest retrieve topics to follow (or retirve articles) for based on any given topic(s)?

## Todo tasks

-   Use ‘non-overlapping’ rather than ‘non-matching’
-   Re-replace topic variables with concepts
-   Add summary for how these suggestions were suggested (good AI practice)(which should also go in the non verbose response)
-   Add description field to whole result, describe the process
    -   Put Labs contact address in the description
-   Add which clusters the multiples come from
-   More words in the error (which is also not an error)
-   More words in the reason why no suggestions we returned
-   inconsistent naming of fields in single/multi topic responses
-   duplication of code constructing responses for single/multi topic queries. e.g. I had to edit two different bits of code to make the one change (to add a description field).
-   Add a URL builder from main page
-   Add strength criteria to the returned topic results
    -   [Multi] a topic that appears in all of the multi topic requests is a prime candidate
        -   all others are lesser suggestions

## Done

-   Add cluster variation
    -   Add parameters for using the 3, 5, 10 and 20 cluster versions
-   Add verbose parameter
    -   return version for all results or nothing
-   Add git hub PR request template
-   the field called 'variables' should probably have a different name, e.g. workings, or something, otherwise it looks like it should be a bunch of settings
-   Add exclude lists
-   Show excludes to the result output
-   [bug] topic that appear in the search criteria should also be removed from the multi search results
    -   remove at end of multi process, or when creating the single topic promises

## Setup

-   Clone the `suggestr` repo
-   Create `.env` file
    -   [Terminal command] `cp .env_example .env`
-   Add a port number to the .env file (anything between 7000 - 9000 is fine)
-   Install npm modules
    -   [Terminal command] `npm install`
-   Run server
    -   [Terminal command] `nodemon index.js`
-   Access server on localhost:<whatever port number you added to the .env> e.g. localhost:8000

## Overview

-   Get Topic from URL path
-   Get list of cluster Topics from S3
    -   Data obtained through clustering algorithms with R
-   Get list of all correlated Topics
    -   Data obtained through the [Correlation service](http://ftlabs-correlations-topics.herokuapp.com/allCoocs)
-   Get list of all Topic follow/unfollow ratios
    -   Data obtained through analysing user follow/unfollow data with R
-   Check if Topic searched exists in clusters
    -   If not, error out
-   Get other topics in that topics cluster
-   Get correlated topics for than topic
-   Compare the above two lists and identify the topics that do not appear in the correlated list
-   Sort the discovered topics by their follow/unfollow ratio
-   Return a list of sorted topics

## Data conversion

I've used the `csvtojson` npm module (installed globally) to convert the .csv files exported from the cluster analysis in R Studio.

### How to convert a CSV to JSON

-   `csvtojson data.csv > data.json`
