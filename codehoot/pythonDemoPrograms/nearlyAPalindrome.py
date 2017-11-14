inputArray = []

for i in range(3):
	stringInput = input()
	inputArray.append(stringInput)

for i in inputArray:
	properPalin = False
	for b in i:
		forwards = i.replace(b,"", 1)
		backwards = forwards [::-1]
		if forwards == backwards:
			properPalin = True
			break;
	if properPalin == False:
		print("not possible")
	else:
		print("possible")

#WORKING