# Suggestr

A Follow based recommendation algorithm

Using topic cluster analysis, topic correlations data and topic follow/unfollow ratios - can we suggest relevant topics to follow (or retirve articles) for based on any given topic(s)?

## Todo tasks

-   Add cluster variation
    -   Add parameters for using the 3, 5, 10 and 20 cluster versions
-   Use ‘non-overlapping’ rather than ‘non-matching’
-   Add description field to whole result, describe the process
-   Re-replace topic variables with concepts
-   Add summary for how these suggestions were suggested (good AI practice)
-   Add exclude lists
-   Show excludes to the result output
-   Add verbose parameter
    -   return version for all results or nothing
-   Add which clusters the multiples come from
-   More words in the error (which is also not an error)
-   More words in the reason why no suggestions we returned
-   Put the above into a to-do list and replace with meeting notes

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
