## Mermaid Flowchart

```mermaid
flowchart TD
    A[Start] --> B[Sleeping]
    B -->C[Wake up]
    C -->D{Still Tired?}
    D -->|Yes| E[Go back to sleep]
    E --> B
    D -->|No| F[Get out of bed]
    F --> G[End]
```

A - Start of the flowchart  
B - You are sleeping currently  
C - You wake up from sleeping  
D - Are you still tired? If yes then go to E, otherwise go to F  
E - Since you are still tired, go back to sleep in your bed. This takes you back to B  
F - Since you are no longer tired, get out of bed  
G - End of the flowchart

The flowchart for this process is fairly straightforward. There is only one decision to be made in the flowchart, that being if you are still tired or not. Since sleep is something you can do to become less tired, this flowchart will continue to flow until the end when you finally have enough sleep to get out of bed.