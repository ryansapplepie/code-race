arr = ["", "Rock", "Paper", "Scissors"]
#or arr = ["", "Scissors", "Paper", "Rock"] if its the reverse one
intake = input().split()
diff = (arr.index(intake[0]) - arr.index(intake[1]))
if diff == 1:
	print("Player 1 Wins!")
elif diff == -1:
	print("Player 2 Wins!")
elif diff == 2:
	print("Player 2 Wins!")
elif diff == -2:
	print("Player 1 Wins!")
elif diff == 0:
	print("Draw.")

#BOTH WORKING