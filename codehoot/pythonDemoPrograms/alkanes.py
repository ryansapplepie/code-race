amountOfCarbonAtoms = int(input())
chains = input().split()
stringOutput = ""
for i in range(1, amountOfCarbonAtoms + 1):
    if i == 1 or i == amountOfCarbonAtoms:
        stringOutput += "CH3"
    elif str(i) in chains:
        stringOutput += "CHCH3"
    else:
        stringOutput += "CH2"
    if i != amountOfCarbonAtoms:
        stringOutput += "-"
print(stringOutput)

#WORKING