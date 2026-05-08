# Random winner


We have raffles where we draw a winner from the participants.

We draw the winner after the competition.  There can be more than 60 participants in multiple groups (beginner, advanced, etc). One group may have 16 participants, another group 30 and another one 25. I've used an online wheel of names randomizer but it's tedious to copy the names from each group to the external website. The results does not provide an easy way to calculate the players' positions (if they were numbers from 1 to n), I could use wheel of names to generate a sequence of numbers from 1 to n and let the app select a random number).

I want a web app with a simple ui that asks me for the competition url, and a submit button. 

When a competition url has been provided and the button is pressed, the web app fetches all participants from the competition, adds them to a list and asks the user to start the raffle. No fancy "Selecting a random winner" animation is need at this time. Just a randomply picked player name as the winner.

Make it possible to delete the winning name from the list, in case the user wants to draw a new winner. Also make it possible to "reset" the list of winners to the original list of names fetched from the competition url.

## Competition system

Initially the competition system is always Disc Golf Metrix. The url looks like
"https://discgolfmetrix.com/3580479". The numerical value after the '/' is the competition url, which is needed when calling tha API (see below).

Disc Golf Metrix provides an API that allows for fetching results programmatically.

Example API url: https://discgolfmetrix.com/api.php?content=result&id=3580479 