prices = []
numOfPresents = int(input())

for i in range(numOfPresents):
	prices.append(float(input()))

highest = 0.00
for b in prices:
	if b > highest:
		highest = b

secondHighest = 0.00
for c in prices:
	if c > secondHighest and c != highest:
		secondHighest = c
if len(str(secondHighest)) != 5:
	secondHighest = (str(secondHighest) + "0")

print(secondHighest)

#WORKING