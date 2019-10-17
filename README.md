# Suggestr

A Follow based recommendation algorithm

Using topic cluster analysis, topic correlations data and topic follow/unfollow ratios - can we suggest relevant topics to follow (or retirve articles) for based on any given topic(s)?

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

## Todo tasks

-   Add option to start search with multiple topics
