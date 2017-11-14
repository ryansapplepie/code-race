notInside = True
foo = 0
for i in input():
    if i == "*" and notInside == True:
        foo += 1
    elif i == "!":
        notInside = not notInside
print(int(foo))

#WORKING