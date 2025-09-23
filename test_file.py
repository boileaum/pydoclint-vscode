"""Test file for pydoclint extension."""


def function_without_docstring(param1, param2):
    return param1 + param2


def function_with_bad_docstring(name: str, age: int) -> str:
    """This function has a docstring but missing Args and Returns sections.

    This should trigger pydoclint warnings.
    """
    return f"{name} is {age} years old"


def function_with_good_docstring(name: str, age: int) -> str:
    """Format a person's information.

    Args:
        name: The person's name.
        age: The person's age.

    Returns:
        A formatted string with the person's information.
    """
    return f"{name} is {age} years old"


def function_with_numpy_style_docstring(name: str, age: int) -> str:
    """
    Format a person's information.

    :param name: The person's name.
    :param age: The person's age.

    :return: A formatted string with the person's information.
    """
    return f"{name} is {age} years old"


class TestClass:
    def method_without_docstring(self, x):
        return x * 2
