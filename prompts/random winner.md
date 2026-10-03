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

In the competition mentioned above, there are two groups: "Kokeneemmat" and "Aloittelijat". 

The competiton results can be obtained in the "Results" array from the API response.

Example output (single item in "Results"):

UserID: "164033"
ScorecardID: "14307500"
Name: "Visa Korjamo" (player name)
ClassName: "Kokeneemmat"

...
...
...

UserID: "221784"
ScorecardID: "14405754"
Name: "Noel Karlsson" (player name)
ClassName: "Aloittelijat"

...
...


At this moment, we only need the Name attributes:

[
    ...
    "Visa Korjamo",
    "Noel Karlsson",
    ...
]

Use this array of names to randomly select a winner.


## Project path

/Users/janimattiellonen/Documents/Development/Random winner/Random winner


## Tech stack
- React 19
- Typescript
- lint
- prettier
- typecheck
- Vite.js
- user port 5112
- add .nvmrc with proper node version


## Minor fixes
- only allow urls, where domain is discgolfmetrix.com
- if there are multiple player with exact same name, add respective player's score and group name in parenthese after the name. for example: John Smith (-5, "Kokeneemmat"). Score can be found in "Diff".

## Doubles

Currently, if the competition is a doubles competition, a random pair is drawn.

I want to be able to optionally choose, whether to draw a random single player from a set of players in a
doubles competition.

For example: here is a doubles competition in Metrix: https://discgolfmetrix.com/3757619


## Metrix id in the url

To be able to generate a random winner for a Metrix competition I have to paste in the full url 
in the text field and press enter. If I want someone else to generate a winner for a competition,
I have to send him the link to the generator AND the link to the competition

It would be better if I could just send the person a link to the generator including the 
competition id. For example: https://randomwinner.janimattiellonen.fi/3771387
would equal me giving the person https://randomwinner.janimattiellonen.fi/ and
https://discgolfmetrix.com/3771387.

If I add a competition url and press fetch, it should "redirect" to the url containing the 
competition id.

Create a new branch.


## Minor random changes

1)
The title for competition https://discgolfmetrix.com/3771387 is 

"Pääkaupunkiseudun junior cup 2026 → Osakilpailu #8, Kirkkonummi".

It becomes "Pääkaupunkiseudun junior cup 2026 &rarr; Osakilpailu #8, Kirkkonummi" in the web app.

When I draw a winner and press the "Remove and draw again" button, I lose the names of the 
previous winners. The names of the previous winners could be listed above the list of remaining players.

You can add fixes to these both in the current branch `competition-id-in-url`


